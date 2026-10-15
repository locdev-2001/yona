<?php

namespace Tests\Feature\Agent\Runtime;

use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\ModelError;
use App\Agent\ValueObjects\ModelErrorKind;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\ModelResponse;
use App\Agent\ValueObjects\ModelRoute;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\Usage;
use Closure;
use RuntimeException;

// Mô hình giả qua đúng Port LanguageModel: mỗi lần gọi lấy bước kế tiếp của kịch bản.
// Một bước là ModelResponse, hoặc closure nhận request (để chèn sự kiện giữa lượt).
final class ScriptedLanguageModel implements LanguageModel
{
    /** @var list<ModelRequest> */
    public array $requests = [];

    /** @param list<ModelResponse|Closure(ModelRequest): ModelResponse> $steps */
    public function __construct(private array $steps) {}

    public function complete(ModelRequest $request): ModelResponse
    {
        $this->requests[] = $request;
        $step = array_shift($this->steps) ?? throw new RuntimeException('The scripted model ran out of steps.');

        return $step instanceof Closure ? $step($request) : $step;
    }

    public static function call(string $name, array $args = [], ?string $id = null): ModelResponse
    {
        return self::calls([[$name, $args, $id]]);
    }

    /** @param list<array{0: string, 1?: array<string, mixed>, 2?: ?string}> $calls */
    public static function calls(array $calls): ModelResponse
    {
        static $sequence = 0;

        return new ModelResponse(
            array_map(fn (array $call) => new ToolCall($call[2] ?? 'call_'.(++$sequence), $call[0], $call[1] ?? []), $calls),
            FinishReason::ToolUse,
            new Usage(inputTokens: 100, outputTokens: 20, costMicroUsd: 1000),
            new ModelRoute('scripted', 'scripted-model'),
        );
    }

    public static function text(string $text): ModelResponse
    {
        return new ModelResponse([new TextBlock($text)], FinishReason::EndTurn, new Usage(inputTokens: 100, outputTokens: 20), new ModelRoute('scripted', 'scripted-model'));
    }

    public static function failure(): ModelResponse
    {
        return ModelResponse::failed(new ModelError(ModelErrorKind::Unavailable, 'Every route failed.'), Usage::zero());
    }

    public static function refusal(): ModelResponse
    {
        return new ModelResponse([new TextBlock('I cannot help with that.')], FinishReason::Refusal, Usage::zero(), new ModelRoute('scripted', 'scripted-model'));
    }
}
