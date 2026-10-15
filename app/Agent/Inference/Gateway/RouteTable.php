<?php

namespace App\Agent\Inference\Gateway;

use App\Agent\ValueObjects\ModelRequest;
use InvalidArgumentException;
use Psr\Log\LoggerInterface;

// Đọc khoá `providers`, `models`, `default_model`, `agent_models` của config/agent.php
// thành danh sách tuyến theo thứ tự ưu tiên. Config sai hình dạng là lỗi lập trình nên
// ném ngay; tuyến thiếu khoá API hoặc base_url thì bỏ qua kèm cảnh báo.
final class RouteTable
{
    private const DEFAULT_TIMEOUT_SECONDS = 60;

    private const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

    /**
     * @param  array<string, array<string, mixed>>  $providers
     * @param  array<string, array{routes?: list<array<string, mixed>>}>  $models
     * @param  array<int|string, string>  $agentModels  ai_agent_id => alias
     */
    public function __construct(
        private readonly array $providers,
        private readonly array $models,
        private readonly string $defaultModel,
        private readonly array $agentModels,
        private readonly LoggerInterface $logger,
    ) {}

    public function aliasFor(ModelRequest $request): string
    {
        if ($request->modelAlias !== null) {
            return $request->modelAlias;
        }

        if ($request->aiAgentId !== null && isset($this->agentModels[$request->aiAgentId])) {
            return (string) $this->agentModels[$request->aiAgentId];
        }

        return $this->defaultModel;
    }

    /** @return list<Route> tuyến dùng được, đúng thứ tự khai báo */
    public function routesFor(string $alias): array
    {
        $routes = [];

        foreach ($this->models[$alias]['routes'] ?? [] as $position => $routeConfig) {
            $route = $this->buildRoute($alias, $position, $routeConfig);

            if ($route !== null) {
                $routes[] = $route;
            }
        }

        return $routes;
    }

    public function hasAlias(string $alias): bool
    {
        return isset($this->models[$alias]);
    }

    /** @param array<string, mixed> $routeConfig */
    private function buildRoute(string $alias, int $position, array $routeConfig): ?Route
    {
        $providerName = $routeConfig['provider'] ?? null;
        $model = $routeConfig['model'] ?? null;

        if (! is_string($providerName) || ! is_string($model) || $model === '') {
            throw new InvalidArgumentException("config agent.models.{$alias}.routes.{$position} needs `provider` and `model`.");
        }

        $provider = $this->providers[$providerName]
            ?? throw new InvalidArgumentException("config agent.models.{$alias} uses unknown provider `{$providerName}`.");

        $protocol = Protocol::tryFrom((string) ($provider['protocol'] ?? ''))
            ?? throw new InvalidArgumentException("config agent.providers.{$providerName}.protocol is not a known protocol.");

        $cacheMode = CacheMode::tryFrom((string) ($provider['cache'] ?? CacheMode::PrefixOnly->value))
            ?? throw new InvalidArgumentException("config agent.providers.{$providerName}.cache is not a known cache mode.");

        $maxTokensField = (string) ($provider['max_tokens_field'] ?? 'max_tokens');

        if (! in_array($maxTokensField, Route::MAX_TOKENS_FIELDS, true)) {
            throw new InvalidArgumentException("config agent.providers.{$providerName}.max_tokens_field must be one of ".implode(', ', Route::MAX_TOKENS_FIELDS).'.');
        }

        $apiKey = $provider['api_key'] ?? null;
        $baseUrl = $provider['base_url'] ?? null;

        if (! is_string($apiKey) || $apiKey === '' || ! is_string($baseUrl) || $baseUrl === '') {
            $this->logger->warning('agent.gateway.route_skipped', [
                'alias' => $alias,
                'provider' => $providerName,
                'model' => $model,
                'reason' => ! is_string($apiKey) || $apiKey === '' ? 'missing_api_key' : 'missing_base_url',
            ]);

            return null;
        }

        return new Route(
            provider: $providerName,
            protocol: $protocol,
            baseUrl: $baseUrl,
            apiKey: $apiKey,
            model: $model,
            maxOutputTokens: (int) ($routeConfig['max_output'] ?? self::DEFAULT_MAX_OUTPUT_TOKENS),
            cacheMode: $cacheMode,
            price: ModelPrice::fromConfig((array) ($routeConfig['price'] ?? [])),
            timeoutSeconds: (int) ($provider['timeout_seconds'] ?? self::DEFAULT_TIMEOUT_SECONDS),
            headers: array_map('strval', array_filter((array) ($provider['headers'] ?? []), fn ($value) => $value !== null && $value !== '')),
            maxTokensField: $maxTokensField,
        );
    }
}
