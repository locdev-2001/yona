<?php

namespace App\Agent\Inference\Gateway;

use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\Inference\Gateway\Drivers\ProtocolDrivers;
use App\Agent\Inference\Gateway\Drivers\ProviderErrorInBody;
use App\Agent\Inference\Gateway\Drivers\WireJson;
use App\Agent\Inference\Gateway\Throttle\Backoff;
use App\Agent\Inference\Gateway\Throttle\CircuitBreaker;
use App\Agent\Inference\Gateway\Throttle\ErrorClassifier;
use App\Agent\Inference\Gateway\Throttle\Failure;
use App\Agent\ValueObjects\ModelError;
use App\Agent\ValueObjects\ModelErrorKind;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\ModelResponse;
use App\Agent\ValueObjects\ModelRoute;
use App\Agent\ValueObjects\Usage;
use GuzzleHttp\Exception\TransferException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Sleep;
use Psr\Log\LoggerInterface;
use Throwable;

// Cổng mô hình: alias → các tuyến theo thứ tự ưu tiên. Lỗi tạm thời thử lại cùng tuyến
// tối đa một lần khi còn kịp trước deadline rồi sang tuyến kế; lỗi khoá sang tuyến kế;
// request sai hay vượt ngữ cảnh thì dừng. Không ném lỗi nhà cung cấp hay mạng: thất bại
// cuối cùng là ModelResponse::failed.
final class ModelRouter implements LanguageModel
{
    public const CACHE_MISS_ROUTE_CHANGED = 'route_changed';

    private const MAX_ATTEMPTS_PER_ROUTE = 2;

    // Còn ít hơn chừng này giây tới deadline thì không mở lời gọi mới.
    private const MIN_CALL_SECONDS = 2.0;

    private const CONNECT_TIMEOUT_SECONDS = 10;

    private const UNPARSED_BODY_EXCERPT = 2000;

    public function __construct(
        private readonly RouteTable $routes,
        private readonly ProtocolDrivers $drivers,
        private readonly HttpFactory $http,
        private readonly ErrorClassifier $classifier,
        private readonly Backoff $backoff,
        private readonly CircuitBreaker $breaker,
        private readonly CallRecorder $recorder,
        private readonly LoggerInterface $logger,
    ) {}

    public function complete(ModelRequest $request): ModelResponse
    {
        $alias = $this->routes->aliasFor($request);
        $routes = $this->routes->routesFor($alias);

        if ($routes === []) {
            $this->logger->warning('agent.gateway.no_route', ['alias' => $alias, 'known_alias' => $this->routes->hasAlias($alias)]);

            return ModelResponse::failed(new ModelError(ModelErrorKind::Unavailable, "No usable route for model alias `{$alias}`."), Usage::zero());
        }

        $usage = Usage::zero();
        $lastFailure = null;
        $lastRoute = null;

        foreach ($routes as $position => $route) {
            if ($this->breaker->isOpen($route)) {
                $this->logger->info('agent.gateway.route_circuit_open', ['alias' => $alias, 'provider' => $route->provider, 'model' => $route->model]);

                continue;
            }

            for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS_PER_ROUTE; $attempt++) {
                if ($this->secondsLeft($request) < self::MIN_CALL_SECONDS) {
                    return $this->exhausted($alias, $lastFailure, $usage, $lastRoute, 'Deadline reached before a provider answered.');
                }

                $lastRoute = $route->identity();
                $outcome = $this->call($request, $route);
                $usage = $usage->plus($outcome->usage);

                if ($outcome->completion !== null) {
                    $this->breaker->recordSuccess($route);

                    return new ModelResponse(
                        $outcome->completion->content,
                        $outcome->completion->finishReason,
                        $this->withCacheMissReason($usage, $position > 0 ? self::CACHE_MISS_ROUTE_CHANGED : null),
                        $route->identity(),
                    );
                }

                $lastFailure = $outcome->failure;
                $this->noteFailure($alias, $route, $lastFailure, $attempt);

                if (! $lastFailure->movesToNextRoute()) {
                    return ModelResponse::failed($lastFailure->error, $usage, $route->identity());
                }

                if (! $this->mayRetrySameRoute($request, $route, $attempt, $lastFailure)) {
                    break;
                }
            }
        }

        return $this->exhausted($alias, $lastFailure, $usage, $lastRoute, "Every route for model alias `{$alias}` is circuit-open.");
    }

    private function call(ModelRequest $request, Route $route): CallOutcome
    {
        $driver = $this->drivers->for($route->protocol);
        $body = $driver->body($request->prompt, $route, $request->cacheKey);
        $timeout = max(1, (int) floor(min($route->timeoutSeconds, $this->secondsLeft($request))));
        $startedAt = hrtime(true);

        try {
            $response = $this->http
                ->withHeaders($driver->headers($route))
                ->timeout($timeout)
                ->connectTimeout(min(self::CONNECT_TIMEOUT_SECONDS, $timeout))
                ->withBody(WireJson::encode($body), 'application/json')
                ->post($driver->endpoint($route));
        } catch (ConnectionException|TransferException $exception) {
            $failure = $this->classifier->fromTransport($exception);
            $usage = new Usage(latencyMs: $this->elapsedMs($startedAt));
            $this->recorder->record($request, $route, null, $failure->error, $body, null, $usage);

            return CallOutcome::failed($failure, $usage);
        }

        $latencyMs = $this->elapsedMs($startedAt);
        $status = $response->status();
        $decoded = json_decode($response->body(), true);
        $decoded = is_array($decoded) ? $decoded : null;
        $logged = $decoded ?? ['unparsed_body' => mb_substr($response->body(), 0, self::UNPARSED_BODY_EXCERPT)];

        if (! $response->successful()) {
            $failure = $this->classifier->fromHttp($status, $decoded, $response->header('retry-after') ?: null);
        } elseif ($decoded === null) {
            $failure = $this->classifier->fromUnreadableResponse($status, 'body is not a JSON object');
        } else {
            try {
                $completion = $driver->parse($decoded);
                $usage = $this->priced($completion->usage, $route, $latencyMs);
                $this->recorder->record($request, $route, $status, null, $body, $logged, $usage);

                return CallOutcome::succeeded($completion, $usage);
            } catch (ProviderErrorInBody $exception) {
                $failure = $this->classifier->fromHttp($exception->status, $exception->body);
            } catch (Throwable $exception) {
                $failure = $this->classifier->fromUnreadableResponse($status, $exception->getMessage());
            }
        }

        $usage = new Usage(latencyMs: $latencyMs);
        $this->recorder->record($request, $route, $status, $failure->error, $body, $logged, $usage);

        return CallOutcome::failed($failure, $usage);
    }

    // Chờ trước lần thử lại cùng tuyến; false khi lỗi không đáng thử lại, đã hết lượt thử,
    // mạch vừa mở, hoặc không còn kịp gọi thêm trước deadline.
    private function mayRetrySameRoute(ModelRequest $request, Route $route, int $attempt, Failure $failure): bool
    {
        if (! $failure->retriesOnSameRoute() || $attempt >= self::MAX_ATTEMPTS_PER_ROUTE || $this->breaker->isOpen($route)) {
            return false;
        }

        $delaySeconds = $this->backoff->delaySeconds($attempt, $failure->retryAfterSeconds);

        if ($delaySeconds + self::MIN_CALL_SECONDS > $this->secondsLeft($request)) {
            return false;
        }

        Sleep::for((int) round($delaySeconds * 1000))->milliseconds();

        return true;
    }

    private function noteFailure(string $alias, Route $route, Failure $failure, int $attempt): void
    {
        if ($failure->countsAgainstRoute()) {
            $this->breaker->recordFailure($route);
        }

        $this->logger->warning('agent.gateway.call_failed', [
            'alias' => $alias,
            'provider' => $route->provider,
            'model' => $route->model,
            'kind' => $failure->error->kind->value,
            'http_status' => $failure->error->httpStatus,
            'attempt' => $attempt,
        ]);
    }

    private function exhausted(string $alias, ?Failure $lastFailure, Usage $usage, ?ModelRoute $lastRoute, string $reasonWithoutFailure): ModelResponse
    {
        $error = $lastFailure->error ?? new ModelError(ModelErrorKind::Unavailable, $reasonWithoutFailure);
        $this->logger->warning('agent.gateway.exhausted', ['alias' => $alias, 'kind' => $error->kind->value]);

        return ModelResponse::failed($error, $usage, $lastRoute);
    }

    private function priced(Usage $tokens, Route $route, int $latencyMs): Usage
    {
        return new Usage(
            $tokens->inputTokens,
            $tokens->outputTokens,
            $tokens->cacheReadTokens,
            $tokens->cacheWriteTokens,
            $route->price->costMicroUsd($tokens),
            $latencyMs,
        );
    }

    private function withCacheMissReason(Usage $usage, ?string $reason): Usage
    {
        return new Usage(
            $usage->inputTokens,
            $usage->outputTokens,
            $usage->cacheReadTokens,
            $usage->cacheWriteTokens,
            $usage->costMicroUsd,
            $usage->latencyMs,
            $reason,
        );
    }

    private function secondsLeft(ModelRequest $request): float
    {
        $now = Carbon::now();

        return ($request->deadline->getTimestamp() - $now->getTimestamp())
            + ((int) $request->deadline->format('u') - (int) $now->format('u')) / 1_000_000;
    }

    private function elapsedMs(int|float $startedAt): int
    {
        return (int) round((hrtime(true) - $startedAt) / 1_000_000);
    }
}
