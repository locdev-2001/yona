<?php

namespace App\Agent\Runtime;

use App\Agent\ValueObjects\AiAgentProfile;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolResultBlock;
use App\Agent\ValueObjects\TurnContext;
use App\Agent\ValueObjects\TurnEvidence;
use App\Agent\ValueObjects\TurnSituation;

// Trạng thái một lượt, chỉ sống trong bộ nhớ job: các bước mô hình ↔ công cụ chỉ ghi
// thêm theo đúng thứ tự, bằng chứng của lượt, các câu khách hỏi trong lượt, các hành
// động đã làm (để không làm lại khi mô hình gọi lại y hệt).
final class Turn
{
    /** @var list<PromptMessage> */
    private array $steps = [];

    private TurnEvidence $evidence;

    /** @var array<string, true> khoá các hành động đã làm xong trong lượt */
    private array $actionsDone = [];

    private ?FallbackReason $fallbackReason = null;

    /**
     * @param  list<PromptMessage>  $history
     * @param  list<string>  $customerTexts
     */
    public function __construct(
        public TurnContext $context,
        public readonly AiAgentProfile $agent,
        public readonly array $history,
        public readonly TurnSituation $situation,
        public readonly ?int $assigneeUserId,
        private array $customerTexts,
    ) {
        $this->evidence = new TurnEvidence;
    }

    /** @return list<PromptMessage> */
    public function steps(): array
    {
        return $this->steps;
    }

    public function evidence(): TurnEvidence
    {
        return $this->evidence;
    }

    public function addEvidence(string $toolResult): void
    {
        $this->evidence = $this->evidence->with($toolResult);
    }

    public function actionDone(string $fingerprint): bool
    {
        return isset($this->actionsDone[$fingerprint]);
    }

    public function recordAction(string $fingerprint): void
    {
        $this->actionsDone[$fingerprint] = true;
    }

    // Đường lui Dispositions đã chọn.
    public function fellBack(FallbackReason $reason): void
    {
        $this->fallbackReason = $reason;
    }

    public function fallbackReason(): ?FallbackReason
    {
        return $this->fallbackReason;
    }

    public function appendAssistant(PromptMessage $message): void
    {
        $this->steps[] = $message;
    }

    /**
     * Khối của tin `user` kế tiếp: kết quả công cụ đứng trước, chữ (tin chen ngang, lời
     * nhắc của Runtime) sau. Nối vào tin `user` cuối nếu lượt đang chờ mô hình đọc nó.
     *
     * @param  list<TextBlock|ToolResultBlock>  $blocks
     */
    public function appendForModel(array $blocks): void
    {
        if ($blocks === []) {
            return;
        }

        $last = end($this->steps);

        if ($last instanceof PromptMessage && $last->role === MessageRole::User) {
            $this->steps[array_key_last($this->steps)] = new PromptMessage(MessageRole::User, [...$last->content, ...$blocks]);

            return;
        }

        $this->steps[] = new PromptMessage(MessageRole::User, $blocks);
    }

    public function addCustomerText(string $text): void
    {
        $this->customerTexts[] = $text;
    }

    public function customerQuestion(): ?string
    {
        $texts = array_values(array_filter(array_map('trim', $this->customerTexts), fn (string $text) => $text !== ''));

        return $texts === [] ? null : implode("\n", $texts);
    }
}
