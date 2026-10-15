<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Prompt trung tính nhà cung cấp. Thứ tự byte cố định cho cache: khối system ổn định
// → tools → lịch sử → phần biến động của lượt ở tin cuối.
final readonly class Prompt
{
    /**
     * @param  list<SystemBlock>  $system
     * @param  list<ToolSpec>  $tools
     * @param  list<PromptMessage>  $messages
     * @param  int|null  $historyCacheBreakpoint  chỉ số tin cuối của phần lịch sử ổn định
     *                                            (điểm ngắt cache thứ hai); null = không đặt
     */
    public function __construct(
        public array $system,
        public array $tools,
        public array $messages,
        public ?int $historyCacheBreakpoint = null,
    ) {
        if ($messages === []) {
            throw new InvalidArgumentException('Prompt needs at least one message.');
        }

        if ($messages[0]->role !== MessageRole::User) {
            throw new InvalidArgumentException('Prompt must start with a user message.');
        }

        if ($historyCacheBreakpoint !== null && ($historyCacheBreakpoint < 0 || $historyCacheBreakpoint >= count($messages))) {
            throw new InvalidArgumentException('History cache breakpoint is out of range.');
        }

        $names = array_map(fn (ToolSpec $tool) => $tool->name, $tools);

        if (count($names) !== count(array_unique($names))) {
            throw new InvalidArgumentException('Tool names must be unique.');
        }
    }
}
