<?php

namespace App\Agent\Evals;

use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\SystemBlock;
use App\Agent\ValueObjects\TextBlock;
use Carbon\CarbonImmutable;
use Closure;
use InvalidArgumentException;
use JsonException;

// Gọi mô hình của bộ chấm qua đúng cổng LanguageModel của agent (nhật ký api_logs, cache,
// dự phòng) và đọc về một đối tượng JSON. Trả lời không đọc được hoặc không qua kiểm tra
// thì hỏi lại một lần, kèm lỗi cụ thể.
final class EvalModel
{
    public const CUSTOMER_ALIAS = 'eval_customer';

    public const JUDGE_ALIAS = 'eval_judge';

    private const ATTEMPTS = 2;

    public function __construct(private readonly LanguageModel $model) {}

    /**
     * @template T
     *
     * @param  Closure(array<string, mixed>): T  $read  ném InvalidArgumentException khi JSON sai hình dạng
     * @return T
     *
     * @throws EvalCallFailed
     */
    public function askJson(string $alias, string $system, string $user, EvalCallScope $scope, EvalSpend $spend, Closure $read): mixed
    {
        $feedback = null;

        for ($attempt = 1; $attempt <= self::ATTEMPTS; $attempt++) {
            $prompt = new Prompt(
                [new SystemBlock($system)],
                [],
                [new PromptMessage(MessageRole::User, [new TextBlock($feedback === null ? $user : "{$user}\n\n{$feedback}")])],
            );

            $response = $this->model->complete(new ModelRequest(
                accountId: $scope->accountId,
                prompt: $prompt,
                deadline: CarbonImmutable::now()->addSeconds($scope->timeoutSeconds)->toDateTimeImmutable(),
                cacheKey: "agent-eval:{$alias}:{$scope->scenarioId}",
                modelAlias: $alias,
                conversationId: $scope->conversationId,
            ));
            $spend->add($response->usage);

            if ($response->finishReason === FinishReason::Error) {
                throw new EvalCallFailed("{$alias} failed: ".($response->error?->message ?? 'unknown error'));
            }

            try {
                return $read(self::decode($response->text()));
            } catch (InvalidArgumentException $exception) {
                $feedback = "Your previous answer was rejected: {$exception->getMessage()} Answer again with one valid JSON object only.";
            }
        }

        throw new EvalCallFailed("{$alias} returned no usable JSON after ".self::ATTEMPTS." attempts: {$feedback}");
    }

    /** @return array<string, mixed> */
    public static function decode(string $text): array
    {
        $text = trim($text);
        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        if ($start === false || $end === false || $end < $start) {
            throw new InvalidArgumentException('The answer holds no JSON object.');
        }

        try {
            $decoded = json_decode(substr($text, $start, $end - $start + 1), true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new InvalidArgumentException("The JSON is invalid ({$exception->getMessage()}).", previous: $exception);
        }

        if (! is_array($decoded) || array_is_list($decoded)) {
            throw new InvalidArgumentException('The answer must be a JSON object.');
        }

        return $decoded;
    }
}
