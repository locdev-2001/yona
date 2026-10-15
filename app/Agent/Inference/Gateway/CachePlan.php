<?php

namespace App\Agent\Inference\Gateway;

use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\SystemBlock;
use App\Agent\ValueObjects\ToolSpec;

// Kế hoạch prompt cache. Thứ tự byte cố định: system ổn định → tools (sắp theo tên) →
// lịch sử → phần biến động của lượt ở tin cuối. Đợt này hai điểm ngắt: cuối khối
// system cacheable sau cùng và tin cuối của phần lịch sử ổn định.
final class CachePlan
{
    // Trên cổng trung gian, mã mô hình Anthropic mang tiền tố này và nhận `cache_control`.
    private const ANTHROPIC_MODEL_PREFIX = 'anthropic/';

    public function directives(Prompt $prompt, Route $route, string $cacheKey): CacheDirectives
    {
        $promptCacheKey = in_array($route->cacheMode, [CacheMode::Automatic, CacheMode::Passthrough], true) ? $cacheKey : null;

        if (! $this->usesExplicitBreakpoints($route)) {
            return new CacheDirectives(promptCacheKey: $promptCacheKey);
        }

        return new CacheDirectives(
            systemBreakpoint: $this->lastCacheableSystemBlock($prompt->system),
            historyBreakpoint: $prompt->historyCacheBreakpoint,
            promptCacheKey: $promptCacheKey,
        );
    }

    /** @return list<ToolSpec> */
    public function orderedTools(Prompt $prompt): array
    {
        $tools = $prompt->tools;
        usort($tools, fn (ToolSpec $left, ToolSpec $right) => strcmp($left->name, $right->name));

        return $tools;
    }

    private function usesExplicitBreakpoints(Route $route): bool
    {
        return match ($route->cacheMode) {
            CacheMode::Explicit => true,
            CacheMode::Passthrough => str_starts_with($route->model, self::ANTHROPIC_MODEL_PREFIX),
            CacheMode::Automatic, CacheMode::PrefixOnly => false,
        };
    }

    /** @param list<SystemBlock> $system */
    private function lastCacheableSystemBlock(array $system): ?int
    {
        $last = null;

        foreach ($system as $index => $block) {
            if ($block->cacheable) {
                $last = $index;
            }
        }

        return $last;
    }
}
