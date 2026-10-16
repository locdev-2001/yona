<?php

namespace App\Agent\Runtime;

use App\Agent\Context\History;
use App\Agent\Context\PromptAssembly;
use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\Contracts\Ports\UnitOfWork;
use App\Agent\Tools\Runner\Registry;
use App\Agent\Tools\Runner\Runner;
use App\Agent\ValueObjects\CoreMessage;
use App\Agent\ValueObjects\DeliveryFailure;
use App\Agent\ValueObjects\DeliveryReceipt;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\HandoffReason;
use App\Agent\ValueObjects\Handover;
use App\Agent\ValueObjects\MessageOrigin;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\ModelResponse;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolResultBlock;
use Carbon\CarbonImmutable;
use DateTimeImmutable;

// Vòng một lượt: kiểm cổng → đưa tin chen ngang vào → ráp prompt → gọi mô hình → chạy
// công cụ đọc và hành động theo đúng thứ tự mô hình phát → lặp, tới khi có MỘT công cụ
// kết thúc hợp lệ. Chữ trơn của mô hình không bao giờ tới khách. Hành động (gửi thẻ, gắn
// nhãn…) qua cùng cổng gửi như `deliver` trước khi chạy, mỗi bộ tham số một lần mỗi lượt.
final class TurnLoop
{
    // Không mở lời gọi mô hình mới khi còn ít hơn chừng này giây tới deadline của lượt.
    private const MIN_SECONDS_FOR_MODEL_CALL = 5;

    private const JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE;

    private const TEXT_ONLY_NOTE = '[runtime note] Text outside tools is never shown to the customer. End this turn now by calling exactly one of: reply, handoff_to_human, wait_for_customer.';

    private const GRACE_NOTE = '[runtime note] The step budget for this turn is used up. Lookups and actions are no longer available: end the turn now with reply, handoff_to_human or wait_for_customer.';

    private const STEER_NOTE = '[runtime note] New messages arrived while you were working; take them into account:';

    public function __construct(
        private readonly LanguageModel $model,
        private readonly Runner $runner,
        private readonly History $history,
        private readonly PromptAssembly $assembly,
        private readonly SendGate $gate,
        private readonly Dispositions $dispositions,
        private readonly ConversationActionWriter $writer,
        private readonly UnitOfWork $unitOfWork,
        private readonly TurnSettings $settings,
    ) {}

    public function run(Turn $turn): TurnEnd
    {
        $guard = new LoopGuard($this->settings->maxSteps);
        $nudged = false;

        while (true) {
            $check = $this->gate->checkTurn($turn, $this->now());

            if ($check->block?->interrupts()) {
                return TurnEnd::Interrupted;
            }

            if ($check->block === BlockReason::WindowClosed) {
                return $this->fallBack(FallbackReason::WindowClosed, $turn);
            }

            $this->steer($turn, $check->pending);

            if (! $guard->mayCallModel() || $this->secondsLeft($turn) < self::MIN_SECONDS_FOR_MODEL_CALL) {
                return $this->fallBack(FallbackReason::LoopCap, $turn);
            }

            $grace = $guard->isGraceStep();

            if ($grace) {
                $turn->appendForModel([new TextBlock(self::GRACE_NOTE)]);
            }

            $response = $this->complete($turn);
            $guard->countModelCall();

            if ($response->finishReason === FinishReason::Error) {
                return $this->fallBack(FallbackReason::TurnFailed, $turn);
            }

            if ($response->finishReason === FinishReason::Refusal) {
                return $this->fallBack(FallbackReason::ModelRefused, $turn);
            }

            $calls = $response->toolCalls();

            if ($calls === []) {
                if ($nudged) {
                    return $this->fallBack(FallbackReason::TextOnly, $turn);
                }

                $nudged = true;
                $this->appendAssistant($turn, $response);
                $turn->appendForModel([new TextBlock(self::TEXT_ONLY_NOTE)]);

                continue;
            }

            $this->appendAssistant($turn, $response);
            $terminal = $this->runCalls($turn, $calls, $guard, $grace);

            if ($guard->halted()) {
                return $this->fallBack(FallbackReason::LoopCap, $turn);
            }

            if ($terminal === null) {
                continue;
            }

            $sendCheck = $this->gate->checkSend($turn, $this->now());

            if ($sendCheck->block?->interrupts()) {
                return TurnEnd::Interrupted;
            }

            if ($sendCheck->block === BlockReason::WindowClosed) {
                return $this->fallBack(FallbackReason::WindowClosed, $turn);
            }

            if ($sendCheck->block === BlockReason::NewMessages) {
                // Tin mới tới đúng lúc định kết thúc: chưa gửi gì, lập lại kế hoạch với tin đó.
                $this->answer($turn, $terminal, ToolResult::failure(ToolErrorCode::Deferred, 'Not sent: the customer just wrote again (see below). Re-plan with the new messages, then end the turn again.'), $guard);

                continue;
            }

            return $this->deliver($turn, $terminal);
        }
    }

    private function complete(Turn $turn): ModelResponse
    {
        $context = $turn->context;
        $prompt = $this->assembly->build($turn->agent, $this->runner->registry()->specs(), $turn->history, $turn->situation, $turn->steps());

        $response = $this->model->complete(new ModelRequest(
            accountId: $context->conversation->accountId,
            prompt: $prompt,
            deadline: $context->deadline,
            cacheKey: "ai-agent:{$context->aiAgentId}",
            aiAgentId: $context->aiAgentId,
            conversationId: $context->conversation->conversationId,
        ));
        $turn->context = $context->withUsage($response->usage);

        return $response;
    }

    // Phản hồi chỉ còn khối mờ (không chữ, không công cụ) thì không đưa vào lượt.
    private function appendAssistant(Turn $turn, ModelResponse $response): void
    {
        $content = array_values(array_filter($response->content, fn ($block) => ! $block instanceof TextBlock || trim($block->text) !== ''));
        $visible = array_filter($content, fn ($block) => $block instanceof TextBlock || $block instanceof ToolCall);

        if ($visible !== []) {
            $turn->appendAssistant(new PromptMessage(MessageRole::Assistant, $content));
        }
    }

    /**
     * Chạy tuần tự theo thứ tự mô hình phát; mọi kết quả của một phản hồi gộp vào một tin.
     * Trả công cụ kết thúc hợp lệ duy nhất (chưa có kết quả), hoặc null để lặp tiếp.
     *
     * @param  list<ToolCall>  $calls
     */
    private function runCalls(Turn $turn, array $calls, LoopGuard $guard, bool $grace): ?ToolCall
    {
        $terminalCalls = array_filter($calls, fn (ToolCall $call) => $this->runner->kindOf($call->name) === ToolKind::Terminal);
        $hasOthers = count($terminalCalls) < count($calls);
        $terminal = null;

        foreach ($calls as $call) {
            $result = $this->resultFor($turn, $call, $terminalCalls, $hasOthers, $grace);

            if ($result === null) {
                $terminal = $call;

                continue;
            }

            $this->answer($turn, $call, $result, $guard);
        }

        return $terminal;
    }

    /**
     * Công cụ kết thúc đi cùng công cụ khác trong một phản hồi thì hoãn: mô hình phải thấy
     * kết quả (thẻ đã gửi hay bị từ chối) rồi mới nói với khách, không bao giờ "em gửi rồi
     * ạ" khi chưa gửi được.
     *
     * @param  array<int, ToolCall>  $terminalCalls
     */
    private function resultFor(Turn $turn, ToolCall $call, array $terminalCalls, bool $hasOthers, bool $grace): ?ToolResult
    {
        $kind = $this->runner->kindOf($call->name);

        if ($kind !== ToolKind::Terminal) {
            if ($grace && $kind !== null) {
                return ToolResult::failure(ToolErrorCode::NotAllowedThisTurn, 'The step budget is used up; end the turn now with reply, handoff_to_human or wait_for_customer.');
            }

            return $this->runner->validate($call, $turn->evidence(), $turn->context->conversation)
                ?? ($kind === ToolKind::Action ? $this->act($turn, $call) : $this->runner->run($call, $turn->context));
        }

        if (count($terminalCalls) > 1) {
            return ToolResult::failure(ToolErrorCode::NotAllowedThisTurn, 'Call exactly one terminal tool (reply, handoff_to_human or wait_for_customer) per response.');
        }

        if ($hasOthers) {
            return ToolResult::failure(ToolErrorCode::Deferred, "Not executed: read the results of the other tools first, then call `{$call->name}` again in its own response.");
        }

        return $this->runner->validate($call, $turn->evidence(), $turn->context->conversation);
    }

    /**
     * Hành động qua cùng cổng như lúc gửi trả lời: khách vừa nhắn thì hoãn để lập lại kế
     * hoạch; lượt không còn quyền thì không làm (vòng kế tiếp tự dừng lượt). Cửa sổ kênh
     * đóng vẫn chạy: công cụ gửi tin tự nhận từ chối của kênh, việc nội bộ vẫn làm được.
     */
    private function act(Turn $turn, ToolCall $call): ToolResult
    {
        $fingerprint = LoopGuard::fingerprint($call);

        if ($turn->actionDone($fingerprint)) {
            return ToolResult::failure(ToolErrorCode::Duplicate, "Already done in this turn with the same arguments; do not repeat `{$call->name}`, go on with the next step.");
        }

        $check = $this->gate->checkSend($turn, $this->now());

        if ($check->block === BlockReason::NewMessages) {
            return ToolResult::failure(ToolErrorCode::Deferred, 'Not done: the customer just wrote again (see below). Re-plan with the new messages first.');
        }

        if ($check->block?->interrupts()) {
            return ToolResult::failure(ToolErrorCode::NotAllowedThisTurn, 'Not done: you no longer handle this conversation in this turn.');
        }

        $result = $this->runner->run($call, $turn->context);

        if ($result->ok) {
            $turn->recordAction($fingerprint);
        }

        return $result;
    }

    private function answer(Turn $turn, ToolCall $call, ToolResult $result, LoopGuard $guard): void
    {
        $encoded = (string) json_encode($result->toArray(), self::JSON_FLAGS);

        if ($result->ok && in_array($this->runner->kindOf($call->name), [ToolKind::Read, ToolKind::Action], true)) {
            $turn->addEvidence($encoded);
        }

        $guard->observe($call, $encoded);
        $turn->appendForModel([new ToolResultBlock($call->id, $encoded, ! $result->ok)]);
    }

    /** @param list<CoreMessage> $pending */
    private function steer(Turn $turn, array $pending): void
    {
        if ($pending === []) {
            return;
        }

        $blocks = $this->history->steeredBlocks($pending);

        foreach ($pending as $message) {
            if ($message->origin === MessageOrigin::Customer && ! $message->private && $message->text !== null) {
                $turn->addCustomerText($message->text);
            }
        }

        if ($blocks !== []) {
            $turn->appendForModel([new TextBlock(self::STEER_NOTE), ...$blocks]);
        }

        $turn->context = $turn->context->withSnapshotMessageId(max(array_map(fn (CoreMessage $message) => $message->id, $pending)));
    }

    private function deliver(Turn $turn, ToolCall $terminal): TurnEnd
    {
        $context = $turn->context;

        return match ($terminal->name) {
            Registry::REPLY => $this->settle(
                $turn,
                $this->writer->sendReply($context->conversation, $context->aiAgentId, (string) $terminal->args['text']),
                TurnEnd::Replied,
            ),
            Registry::HANDOFF_TO_HUMAN => $this->handOver($turn, $terminal),
            default => TurnEnd::Waited,
        };
    }

    private function handOver(Turn $turn, ToolCall $terminal): TurnEnd
    {
        $context = $turn->context;
        $handover = new Handover(
            HandoffReason::tryFrom((string) $terminal->args['reason']) ?? HandoffReason::Other,
            trim((string) $terminal->args['note']),
            $turn->customerQuestion(),
        );

        return $this->unitOfWork->run(function () use ($turn, $context, $terminal, $handover) {
            if (isset($terminal->args['holding_reply'])) {
                $holding = $this->writer->sendReply($context->conversation, $context->aiAgentId, (string) $terminal->args['holding_reply']);

                if (! $holding->isDelivered() && $holding->failure !== DeliveryFailure::WindowClosed) {
                    return $this->settle($turn, $holding, TurnEnd::HandedOff);
                }
            }

            return $this->settle($turn, $this->writer->handOver($context->conversation, $context->aiAgentId, $handover), TurnEnd::HandedOff);
        });
    }

    private function settle(Turn $turn, DeliveryReceipt $receipt, TurnEnd $success): TurnEnd
    {
        return match ($receipt->failure) {
            null => $success,
            DeliveryFailure::FloorLost, DeliveryFailure::AutoResponderOff => TurnEnd::Interrupted,
            DeliveryFailure::WindowClosed => $this->fallBack(FallbackReason::WindowClosed, $turn),
            DeliveryFailure::Rejected, DeliveryFailure::NotFound, DeliveryFailure::NotPermitted => $this->fallBack(FallbackReason::TurnFailed, $turn),
        };
    }

    private function fallBack(FallbackReason $reason, Turn $turn): TurnEnd
    {
        return $this->dispositions->fallBack($reason, $turn);
    }

    private function secondsLeft(Turn $turn): int
    {
        return $turn->context->deadline->getTimestamp() - $this->now()->getTimestamp();
    }

    private function now(): DateTimeImmutable
    {
        return CarbonImmutable::now()->toDateTimeImmutable();
    }
}
