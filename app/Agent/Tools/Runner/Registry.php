<?php

namespace App\Agent\Tools\Runner;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\ValueObjects\HandoffReason;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolSpec;
use InvalidArgumentException;

// Nguồn duy nhất của tên và khai báo công cụ. Công cụ đọc và công cụ hành động do Kernel
// đăng ký (hiện thực Contracts\Extensions\Tool); công cụ kết thúc khai ở đây vì Runtime
// tự giao kết quả của chúng (lối ra duy nhất), không có phần thân chạy riêng.
final class Registry
{
    public const REPLY = 'reply';

    public const HANDOFF_TO_HUMAN = 'handoff_to_human';

    public const WAIT_FOR_CUSTOMER = 'wait_for_customer';

    public const REPLY_MAX_CHARACTERS = 2000;

    public const HOLDING_REPLY_MAX_CHARACTERS = 1000;

    /** @var array<string, Tool> */
    private array $tools = [];

    /** @var array<string, ToolSpec> */
    private array $specs = [];

    /** @param iterable<Tool> $tools công cụ đọc và công cụ hành động */
    public function __construct(iterable $tools)
    {
        foreach ($tools as $tool) {
            $spec = $tool->spec();

            if ($spec->kind === ToolKind::Terminal || isset($this->specs[$spec->name])) {
                throw new InvalidArgumentException("Tool `{$spec->name}` must be a uniquely named read or action tool.");
            }

            $this->tools[$spec->name] = $tool;
            $this->specs[$spec->name] = $spec;
        }

        foreach (self::terminalSpecs() as $spec) {
            $this->specs[$spec->name] = $spec;
        }
    }

    /** @return list<ToolSpec> */
    public function specs(): array
    {
        return array_values($this->specs);
    }

    public function spec(string $name): ?ToolSpec
    {
        return $this->specs[$name] ?? null;
    }

    // Phần thân chạy được của một công cụ đọc hoặc hành động; null với công cụ kết thúc.
    public function tool(string $name): ?Tool
    {
        return $this->tools[$name] ?? null;
    }

    /** @return list<string> */
    public function terminalNames(): array
    {
        return [self::REPLY, self::HANDOFF_TO_HUMAN, self::WAIT_FOR_CUSTOMER];
    }

    /** @return list<ToolSpec> */
    private static function terminalSpecs(): array
    {
        return [
            new ToolSpec(self::REPLY, 'Send your message to the customer and end the turn. The text is sent exactly as written, '
                .'so write it as the shop\'s staff member, in the customer\'s language. Any amount of money or percentage in it '
                .'must come from the business\'s word (a tool result of this turn or a staff or shop owner message in the history), '
                .'or be calculated from it.', [
                    'type' => 'object',
                    'properties' => [
                        'text' => ['type' => 'string', 'minLength' => 1, 'maxLength' => self::REPLY_MAX_CHARACTERS, 'description' => 'The message the customer will read.'],
                        'sources' => ['type' => 'array', 'items' => ['type' => 'string'], 'maxItems' => 10, 'description' => 'Refs of the search results this reply relies on; empty when none.'],
                    ],
                    'required' => ['text'],
                    'additionalProperties' => false,
                ], ToolKind::Terminal),
            new ToolSpec(self::HANDOFF_TO_HUMAN, 'Hand the conversation to the shop\'s staff and end the turn: use it when the customer '
                .'needs binding information (price, policy, promotion, stock, order) that the business data does not give you, '
                .'when the customer asks for a person, complains, or asks something outside what you can handle. Optionally send '
                .'a short holding_reply first, promising to check, with no amounts and no promises you cannot keep.', [
                    'type' => 'object',
                    'properties' => [
                        'reason' => ['type' => 'string', 'enum' => array_map(fn (HandoffReason $reason) => $reason->value, HandoffReason::cases())],
                        'note' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 2000, 'description' => 'Private note for the staff, in the shop\'s language: what the customer wants and what is missing.'],
                        'holding_reply' => ['type' => 'string', 'minLength' => 1, 'maxLength' => self::HOLDING_REPLY_MAX_CHARACTERS, 'description' => 'Optional short message to the customer before the staff takes over.'],
                    ],
                    'required' => ['reason', 'note'],
                    'additionalProperties' => false,
                ], ToolKind::Terminal),
            new ToolSpec(self::WAIT_FOR_CUSTOMER, 'End the turn without sending anything more. Use it only when the customer\'s latest '
                .'message needs no answer (a sticker, "ok", "thanks" after the matter is settled), or when what you sent earlier in '
                .'this turn (a question with options, a card) already says everything.', [
                    'type' => 'object',
                    'properties' => [
                        'reason' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 300, 'description' => 'Why no answer is needed.'],
                    ],
                    'required' => ['reason'],
                    'additionalProperties' => false,
                ], ToolKind::Terminal),
        ];
    }
}
