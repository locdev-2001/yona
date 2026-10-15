<?php

use App\Agent\Runtime\TurnSettings;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\ModelResponse;
use App\Agent\ValueObjects\ModelRoute;
use App\Agent\ValueObjects\ProviderBlock;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolResultBlock;
use App\Agent\ValueObjects\Usage;
use App\Builders\Messages\MessageBuilder;
use App\Models\ApiLog;
use App\Models\CannedResponse;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\AiAgents\AiAgentService;
use App\Services\Conversations\AutoResponderStopReason;
use App\Services\Conversations\ConversationAutoResponder;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Feature\Agent\Runtime\ScriptedLanguageModel as Model;
use Tests\Feature\Agent\Runtime\TurnKit;

beforeEach(function () {
    TurnKit::boot();
    Http::preventStrayRequests();
});

/** @return list<string> chữ của mọi khối text trong mọi tin của request */
function promptTexts(ModelRequest $request): array
{
    $texts = [];

    foreach ($request->prompt->messages as $message) {
        foreach ($message->content as $block) {
            if ($block instanceof TextBlock) {
                $texts[] = $block->text;
            }
        }
    }

    return $texts;
}

/** @return list<array<string, mixed>> kết quả công cụ (đã giải JSON) ở tin cuối của request */
function lastToolResults(ModelRequest $request): array
{
    $messages = $request->prompt->messages;
    $last = end($messages);

    return array_values(array_map(
        fn (ToolResultBlock $block) => json_decode($block->content, true),
        array_filter($last->content, fn ($block) => $block instanceof ToolResultBlock),
    ));
}

function conversationIsAuto(Conversation $conversation): bool
{
    return (bool) $conversation->fresh()->ai_auto_reply;
}

it('looks things up twice then replies exactly once under the AI agent name', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    CannedResponse::query()->create(['account_id' => $conversation->account_id, 'short_code' => 'size-ao-thun', 'content' => 'Áo thun có size S, M, L, XL.']);
    CannedResponse::query()->create(['account_id' => $conversation->account_id, 'short_code' => 'gia-ao-thun', 'content' => 'Áo thun trắng giá 150.000đ.']);
    $model = TurnKit::model([
        Model::call('search_knowledge', ['query' => 'size áo thun']),
        Model::call('search_knowledge', ['query' => 'giá áo thun']),
        Model::call('reply', ['text' => 'Dạ áo thun trắng còn size M, giá 150k ạ.', 'sources' => ['canned_response:'.CannedResponse::query()->where('short_code', 'gia-ao-thun')->value('id')]]),
    ]);

    TurnKit::customerSays($conversation, 'Áo thun trắng size M giá bao nhiêu shop?');

    expect(TurnKit::pendingTurns())->toHaveCount(1);
    TurnKit::runPendingTurns();

    $replies = TurnKit::aiReplies($conversation);
    expect($replies)->toHaveCount(1)
        ->and($replies[0]->content)->toBe('Dạ áo thun trắng còn size M, giá 150k ạ.')
        ->and($replies[0]->sender_id)->toBe($aiAgent->id)
        ->and($model->requests)->toHaveCount(3)
        ->and(lastToolResults($model->requests[1])[0]['data'][0]['ref'])->toStartWith('canned_response:')
        ->and($conversation->fresh()->floor_held_until)->toBeNull()
        ->and(conversationIsAuto($conversation))->toBeTrue();
});

it('refuses an unsourced price, then hands over with a holding reply and a private note', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    $model = TurnKit::model([
        Model::call('reply', ['text' => 'Dạ áo này giá 450k ạ.']),
        Model::call('handoff_to_human', [
            'reason' => 'binding_info_missing',
            'note' => 'Khách hỏi giá áo khoác, dữ liệu shop chưa có giá.',
            'holding_reply' => 'Dạ anh chờ em kiểm tra lại giá rồi báo mình ngay nhé.',
        ]),
    ]);

    TurnKit::customerSays($conversation, 'Áo khoác jean giá bao nhiêu vậy shop?');
    TurnKit::runPendingTurns();

    $refusal = lastToolResults($model->requests[1])[0];
    $replies = TurnKit::aiReplies($conversation);
    $notes = TurnKit::aiNotes($conversation);

    expect($refusal['ok'])->toBeFalse()
        ->and($refusal['error']['code'])->toBe('unsourced_claim')
        ->and($replies)->toHaveCount(1)
        ->and($replies[0]->content)->toBe('Dạ anh chờ em kiểm tra lại giá rồi báo mình ngay nhé.')
        ->and($notes)->toHaveCount(1)
        ->and($notes[0]->content)->toContain('Khách hỏi giá áo khoác')
        ->and($notes[0]->content_attributes['ai_handoff'])->toBe(['reason' => 'binding_info_missing', 'question' => 'Áo khoác jean giá bao nhiêu vậy shop?'])
        ->and($notes[0]->content_attributes['mentions'] ?? [])->toBe([])
        ->and($notes[0]->content)->not->toContain('@')
        ->and(conversationIsAuto($conversation))->toBeFalse()
        ->and($conversation->fresh()->floor_held_until)->toBeNull();
});

it('steers a customer message that arrives mid-turn into the running turn and answers once', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        function () use ($conversation) {
            TurnKit::customerSays($conversation, 'À cho em hỏi thêm size L còn không?');

            return Model::call('search_knowledge', ['query' => 'size áo']);
        },
        Model::call('reply', ['text' => 'Dạ áo còn đủ size M và L ạ.']),
    ]);

    TurnKit::customerSays($conversation, 'Áo thun còn size M không shop?');
    TurnKit::runPendingTurns();

    expect(promptTexts($model->requests[1]))->toContain('[customer] À cho em hỏi thêm size L còn không?')
        ->and(TurnKit::pendingTurns())->toHaveCount(1);

    TurnKit::runPendingTurns();

    expect(TurnKit::aiReplies($conversation))->toHaveCount(1)
        ->and(TurnKit::aiNotes($conversation))->toBeEmpty()
        ->and($model->requests)->toHaveCount(2);
});

it('re-plans instead of sending when the customer writes right before the reply goes out', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        function () use ($conversation) {
            TurnKit::customerSays($conversation, 'Ship về Đà Nẵng được không?');

            return Model::call('reply', ['text' => 'Dạ áo còn size M ạ.']);
        },
        Model::call('reply', ['text' => 'Dạ áo còn size M, shop ship toàn quốc ạ.']),
    ]);

    TurnKit::customerSays($conversation, 'Áo còn size M không?');
    TurnKit::runPendingTurns();

    $deferred = lastToolResults($model->requests[1])[0];

    expect($deferred['error']['code'])->toBe('deferred')
        ->and(promptTexts($model->requests[1]))->toContain('[customer] Ship về Đà Nẵng được không?')
        ->and(array_map(fn (Message $message) => $message->content, TurnKit::aiReplies($conversation)))->toBe(['Dạ áo còn size M, shop ship toàn quốc ạ.']);
});

it('blocks public staff messages during the turn but lets private notes through, then releases the floor', function () {
    ['conversation' => $conversation, 'staff' => $staff] = TurnKit::autoConversation();
    $outcomes = [];
    TurnKit::model([
        function () use ($conversation, $staff, &$outcomes) {
            try {
                TurnKit::staffSays($conversation, $staff, 'Để anh trả lời cho.');
                $outcomes['public'] = 'sent';
            } catch (HttpException $exception) {
                $outcomes['public'] = $exception->getStatusCode();
            }
            $outcomes['private'] = TurnKit::staffSays($conversation, $staff, 'Ghi chú: khách quen.', private: true)->id;
            $outcomes['held'] = $conversation->fresh()->floor_held_until !== null;

            return Model::call('reply', ['text' => 'Dạ em chào anh ạ.']);
        },
    ]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    TurnKit::runPendingTurns();

    expect($outcomes['public'])->toBe(409)
        ->and($outcomes['private'])->toBeInt()
        ->and($outcomes['held'])->toBeTrue()
        ->and(TurnKit::aiReplies($conversation))->toHaveCount(1)
        ->and($conversation->fresh()->floor_held_until)->toBeNull()
        ->and(conversationIsAuto($conversation))->toBeTrue();
});

it('frees the floor at once when the inbox AI is turned off, deleted or replaced mid-turn', function (string $change) {
    ['conversation' => $conversation, 'staff' => $staff, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    $outcomes = [];
    TurnKit::model([
        function () use ($conversation, $staff, $aiAgent, $change, &$outcomes) {
            $service = app(AiAgentService::class);
            match ($change) {
                'turned off' => $service->update($aiAgent, ['enabled' => false]),
                'deleted' => $service->delete($aiAgent),
                'replaced' => $service->assignInbox($conversation->inbox->fresh(), $service->create($conversation->account, 'Binh')),
            };
            $outcomes['held'] = $conversation->fresh()->floor_held_until !== null;

            try {
                TurnKit::staffSays($conversation, $staff, 'Để anh trả lời cho.');
                $outcomes['public'] = 'sent';
            } catch (HttpException $exception) {
                $outcomes['public'] = $exception->getStatusCode();
            }

            return Model::call('reply', ['text' => 'Không được gửi.']);
        },
    ]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    TurnKit::runPendingTurns();

    expect($outcomes['held'])->toBeFalse()
        ->and($outcomes['public'])->toBe('sent')
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and($conversation->fresh()->floor_held_until)->toBeNull();
})->with(['turned off', 'deleted', 'replaced']);

it('cancels the turn without sending when the owner answers from the channel app mid-turn', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        function () use ($conversation) {
            TurnKit::ownerEchoes($conversation, 'Chị nhắn anh qua Zalo nhé.');

            return Model::call('search_knowledge', ['query' => 'áo']);
        },
        Model::call('reply', ['text' => 'Không được gửi.']),
    ]);

    TurnKit::customerSays($conversation, 'Shop ơi áo còn không?');
    TurnKit::runPendingTurns();

    expect($model->requests)->toHaveCount(1)
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toBeEmpty()
        ->and(conversationIsAuto($conversation))->toBeFalse()
        ->and($conversation->fresh()->floor_held_until)->toBeNull();
});

it('reads what the staff told the customer when the switch is turned back on', function () {
    ['conversation' => $conversation, 'staff' => $staff] = TurnKit::autoConversation();
    $model = TurnKit::model([
        Model::call('reply', ['text' => 'Dạ em chào anh ạ.']),
        Model::call('wait_for_customer', ['reason' => 'Khách cảm ơn.']),
    ]);
    TurnKit::customerSays($conversation, 'Shop ơi');
    TurnKit::runPendingTurns();

    TurnKit::staffSays($conversation, $staff, 'Dạ anh ơi mẫu này bên em còn màu đen nhé.');
    expect(conversationIsAuto($conversation))->toBeFalse();

    TurnKit::customerSays($conversation, 'Ok cảm ơn shop');
    expect(TurnKit::pendingTurns())->toBeEmpty();

    app(ConversationAutoResponder::class)->enable($conversation->fresh());
    TurnKit::customerSays($conversation, 'Cảm ơn nhé');
    TurnKit::runPendingTurns();

    $history = $model->requests[1]->prompt->messages;

    expect(promptTexts($model->requests[1]))->toContain('[staff: Minh] Dạ anh ơi mẫu này bên em còn màu đen nhé.')
        ->and($history[1]->role)->toBe(MessageRole::Assistant)
        ->and($history[1]->content[0]->text)->toBe('Dạ em chào anh ạ.');
});

it('does not schedule a turn while the conversation is manual, or for the AI\'s own messages', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();

    (new MessageBuilder($aiAgent, $conversation->fresh(), ['content' => 'Dạ em chào anh.']))->perform();
    expect(TurnKit::pendingTurns())->toBeEmpty();

    app(ConversationAutoResponder::class)->disable($conversation->fresh(), AutoResponderStopReason::Manual);
    TurnKit::customerSays($conversation, 'Shop ơi');

    expect(TurnKit::pendingTurns())->toBeEmpty();
});

it('nudges once after a text-only answer, then leaves a private note and switches to manual', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([Model::text('Dạ áo còn ạ.'), Model::text('Dạ áo vẫn còn ạ.')]);

    TurnKit::customerSays($conversation, 'Áo còn không shop?');
    TurnKit::runPendingTurns();

    expect($model->requests)->toHaveCount(2)
        ->and(implode("\n", promptTexts($model->requests[1])))->toContain('[runtime note]')
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1)
        ->and(TurnKit::aiNotes($conversation)[0]->content_attributes['ai_handoff'] ?? null)->toBeNull()
        ->and(conversationIsAuto($conversation))->toBeFalse();
});

it('stops a turn that repeats the same call with the same result', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        Model::call('search_knowledge', ['query' => 'áo', 'limit' => 3]),
        Model::call('search_knowledge', ['limit' => 3, 'query' => 'áo']),
        Model::call('search_knowledge', ['query' => 'áo', 'limit' => 3]),
        Model::call('reply', ['text' => 'Không tới được đây.']),
    ]);

    TurnKit::customerSays($conversation, 'Áo còn không?');
    TurnKit::runPendingTurns();

    expect($model->requests)->toHaveCount(3)
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1)
        ->and(conversationIsAuto($conversation))->toBeFalse();
});

it('releases the floor and leaves a note without messaging the customer when every model route fails', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    TurnKit::model([Model::failure()]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    TurnKit::runPendingTurns();
    $conversation->refresh();

    expect(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1)
        ->and($conversation->floor_held_until)->toBeNull()
        ->and($conversation->ai_auto_reply)->toBeFalse();
});

it('releases the floor and leaves a note when the turn job crashes', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    TurnKit::model([fn () => throw new RuntimeException('worker blew up')]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    TurnKit::runPendingTurns();
    $conversation->refresh();

    expect(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1)
        ->and($conversation->floor_held_until)->toBeNull()
        ->and($conversation->ai_auto_reply)->toBeFalse();
});

it('never runs a turn twice once the model has been called', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([Model::call('wait_for_customer', ['reason' => 'Sticker.'])]);

    TurnKit::customerSays($conversation, 'Ok');
    $job = TurnKit::pendingTurns()[0];
    app()->call([$job, 'handle']);
    app()->call([$job, 'handle']);

    expect($model->requests)->toHaveCount(1)
        ->and($job->maxExceptions)->toBe(1)
        ->and($job->failOnTimeout)->toBeTrue()
        ->and($job->retryUntil()->getTimestamp())->toBeGreaterThan(now()->getTimestamp());
});

it('keeps each account\'s knowledge to itself', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    ['conversation' => $other] = TurnKit::autoConversation();
    CannedResponse::query()->create(['account_id' => $other->account_id, 'short_code' => 'gia-ao', 'content' => 'Áo thun giá 99.000đ.']);
    $model = TurnKit::model([
        Model::call('search_knowledge', ['query' => 'giá áo']),
        Model::call('reply', ['text' => 'Dạ áo giá 99k ạ.']),
        Model::call('wait_for_customer', ['reason' => 'Không có dữ liệu.']),
    ]);

    TurnKit::customerSays($conversation, 'Giá áo bao nhiêu?');
    TurnKit::runPendingTurns();

    expect(lastToolResults($model->requests[1])[0]['data'])->toBe([])
        ->and(lastToolResults($model->requests[2])[0]['error']['code'])->toBe('unsourced_claim')
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty();
});

it('does not send and leaves a note when the channel reply window has closed', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        function () use ($conversation) {
            $channel = $conversation->inbox->channel;
            $channel->forceFill(['additional_attributes' => ['agent_reply_time_window' => 1]])->save();
            Message::query()->where('conversation_id', $conversation->id)->update(['created_at' => now()->subHours(2)]);

            return Model::call('reply', ['text' => 'Dạ em chào anh ạ.']);
        },
    ]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    TurnKit::runPendingTurns();

    expect($model->requests)->toHaveCount(1)
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1)
        ->and(TurnKit::aiNotes($conversation)[0]->content)->toContain('window')
        ->and(conversationIsAuto($conversation))->toBeTrue();
});

it('pauses the account for the day once the model budget is spent, with one note per conversation', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    config(['agent.turn.daily_budget_usd' => 1]);
    app()->forgetInstance(TurnSettings::class);
    ApiLog::query()->create([
        'account_id' => $conversation->account_id, 'provider' => 'anthropic', 'model' => 'claude-test',
        'request' => [], 'cost_micro_usd' => 1_000_000,
    ]);
    TurnKit::model([]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    TurnKit::customerSays($conversation, 'Có ai không?');

    expect(TurnKit::pendingTurns())->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1)
        ->and(conversationIsAuto($conversation))->toBeTrue();
});

it('runs lookups first and defers a terminal tool called in the same response', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        Model::calls([['search_knowledge', ['query' => 'áo']], ['reply', ['text' => 'Dạ còn ạ.']]]),
        Model::calls([['reply', ['text' => 'Dạ còn ạ.']], ['wait_for_customer', ['reason' => 'x']]]),
        Model::call('reply', ['text' => 'Dạ áo còn ạ.']),
    ]);

    TurnKit::customerSays($conversation, 'Áo còn không?');
    TurnKit::runPendingTurns();

    $afterLookup = lastToolResults($model->requests[1]);
    $afterTwoTerminals = lastToolResults($model->requests[2]);

    expect($afterLookup[0]['ok'])->toBeTrue()
        ->and($afterLookup[1]['error']['code'])->toBe('deferred')
        ->and(array_column(array_column($afterTwoTerminals, 'error'), 'code'))->toBe(['not_allowed_this_turn', 'not_allowed_this_turn'])
        ->and(array_map(fn (Message $message) => $message->content, TurnKit::aiReplies($conversation)))->toBe(['Dạ áo còn ạ.']);
});

it('gives one grace step for a terminal tool once the step budget is spent', function () {
    config(['agent.turn.max_steps' => 2]);
    app()->forgetInstance(TurnSettings::class);
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        Model::call('search_knowledge', ['query' => 'áo']),
        Model::call('search_knowledge', ['query' => 'quần']),
        Model::calls([['search_knowledge', ['query' => 'mũ']], ['wait_for_customer', ['reason' => 'x']]]),
    ]);

    TurnKit::customerSays($conversation, 'Shop có gì?');
    TurnKit::runPendingTurns();

    expect($model->requests)->toHaveCount(3)
        ->and(implode("\n", promptTexts($model->requests[2])))->toContain('step budget for this turn is used up')
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1)
        ->and(conversationIsAuto($conversation))->toBeFalse();
});

it('falls back to the standard holding reply and a hand-over when the model keeps stating unsourced amounts', function () {
    config(['agent.turn.max_steps' => 1]);
    app()->forgetInstance(TurnSettings::class);
    ['conversation' => $conversation] = TurnKit::autoConversation();
    TurnKit::model([
        Model::call('reply', ['text' => 'Dạ giá 450k ạ.']),
        Model::call('reply', ['text' => 'Dạ giá 450.000đ ạ.']),
    ]);

    TurnKit::customerSays($conversation, 'Giá bao nhiêu?');
    TurnKit::runPendingTurns();

    $replies = TurnKit::aiReplies($conversation);
    $notes = TurnKit::aiNotes($conversation);

    expect($replies)->toHaveCount(1)
        ->and($replies[0]->content)->toBe(__('ai_agent_turns.holding_reply'))
        ->and($notes)->toHaveCount(1)
        ->and($notes[0]->content_attributes['ai_handoff']['reason'])->toBe('binding_info_missing')
        ->and(conversationIsAuto($conversation))->toBeFalse();
});

it('skips the model when the channel window is already closed at wake-up', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $conversation->inbox->channel->forceFill(['additional_attributes' => ['agent_reply_time_window' => 1]])->save();
    $model = TurnKit::model([]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    Message::query()->where('conversation_id', $conversation->id)->update(['created_at' => now()->subHours(2)]);
    TurnKit::runPendingTurns();

    expect($model->requests)->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1);
});

it('schedules the turn on the ai queue after the channel quiet window', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();

    TurnKit::customerSays($conversation, 'Shop ơi');
    $job = TurnKit::pendingTurns()[0];

    expect($job->queue)->toBe('ai')
        ->and($job->delay)->toBe(config('agent.turn.debounce_seconds.default'))
        ->and($job->timeout)->toBe(config('agent.turn.job_timeout_seconds'))
        ->and($job->middleware()[0]->key)->toBe("ai-turn:{$conversation->id}");
});

it('keeps the provider reasoning blocks of a step in the turn so the next step can replay them', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $route = new ModelRoute('anthropic', 'claude-test');
    $thinking = new ProviderBlock('thinking', $route, ['type' => 'thinking', 'thinking' => '', 'signature' => 'sig']);
    $model = TurnKit::model([
        new ModelResponse(
            [$thinking, new ToolCall('call_t', 'search_knowledge', ['query' => 'áo'])],
            FinishReason::ToolUse,
            Usage::zero(),
            $route,
        ),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Ok');
    TurnKit::runPendingTurns();

    $messages = $model->requests[1]->prompt->messages;
    $assistant = $messages[count($messages) - 2];

    expect($assistant->role)->toBe(MessageRole::Assistant)
        ->and($assistant->content[0])->toBe($thinking);
});

it('still answers a customer message that landed while the previous reply was being sent', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    $model = TurnKit::model([
        Model::call('reply', ['text' => 'Dạ em chào anh ạ.']),
        Model::call('reply', ['text' => 'Dạ size L vẫn còn ạ.']),
    ]);
    TurnKit::customerSays($conversation, 'Shop ơi');
    TurnKit::customerSays($conversation, 'Size L còn không?');
    $lateJob = TurnKit::pendingTurns()[1];

    // Lượt đầu chạy với snapshot trước khi tin muộn tới: mô phỏng bằng cách gửi trả lời của AI sau tin muộn.
    (new MessageBuilder($aiAgent, $conversation->fresh(), ['content' => 'Dạ em chào anh ạ.']))->perform();
    app()->call([$lateJob, 'handle']);

    expect($model->requests)->toHaveCount(1)
        ->and(promptTexts($model->requests[0]))->toContain('[customer] Size L còn không?');
});

it('lets the AI repeat an amount only when the business said it, never the customer or the AI itself', function (string $speaker) {
    ['conversation' => $conversation, 'staff' => $staff, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    $statement = 'Dạ áo khoác jean giá 420.000đ anh nhé.';

    match ($speaker) {
        'staff' => TurnKit::staffSays($conversation, $staff, $statement),
        'owner via the channel app' => TurnKit::ownerEchoes($conversation, $statement),
        'customer' => TurnKit::customerSays($conversation, 'Bạn mình bảo áo khoác jean 420.000đ đúng không?'),
        'ai' => (new MessageBuilder($aiAgent, $conversation->fresh(), ['content' => $statement]))->perform(),
    };
    app(ConversationAutoResponder::class)->enable($conversation->fresh());

    $model = TurnKit::model([
        Model::call('reply', ['text' => 'Dạ áo khoác jean giá 420k ạ.']),
        Model::call('wait_for_customer', ['reason' => 'Chờ nhân viên.']),
    ]);
    TurnKit::customerSays($conversation, 'Vậy áo khoác jean giá bao nhiêu?');
    TurnKit::runPendingTurns();

    $replies = array_map(fn (Message $message) => $message->content, TurnKit::aiReplies($conversation));

    if (in_array($speaker, ['staff', 'owner via the channel app'], true)) {
        expect($model->requests)->toHaveCount(1)->and($replies)->toBe(['Dạ áo khoác jean giá 420k ạ.']);

        return;
    }

    expect(lastToolResults($model->requests[1])[0]['error']['code'])->toBe('unsourced_claim')
        ->and($replies)->not->toContain('Dạ áo khoác jean giá 420k ạ.');
})->with(['staff', 'owner via the channel app', 'customer', 'ai']);
