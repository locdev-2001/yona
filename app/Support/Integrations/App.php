<?php

namespace App\Support\Integrations;

use App\Models\Account;

// Port từ refs/chatwoot/app/models/integrations/app.rb — một mục trong danh mục
// ứng dụng tích hợp. Điều kiện hiện/ẩn đọc từ config/integration/apps.php
// (feature_flag + requires_config) nên thêm app mới không phải sửa lớp này.
class App
{
    public function __construct(public readonly array $params) {}

    /** @return list<self> */
    public static function all(): array
    {
        return collect(config('integration.apps'))
            ->map(fn (array $params) => new self($params))
            ->values()
            ->all();
    }

    public static function find(string $id): ?self
    {
        return collect(self::all())->first(fn (self $app) => $app->id() === $id);
    }

    public function id(): string
    {
        return $this->params['id'];
    }

    public function name(): string
    {
        return __("integration_apps.{$this->params['i18n_key']}.name");
    }

    public function description(): string
    {
        return __("integration_apps.{$this->params['i18n_key']}.description");
    }

    public function shortDescription(): ?string
    {
        $key = "integration_apps.{$this->params['i18n_key']}.short_description";
        $translated = __($key);

        return $translated === $key ? null : $translated;
    }

    public function action(): ?string
    {
        $action = $this->params['action'] ?? null;

        if ($action === null) {
            return null;
        }

        return match ($this->id()) {
            'slack' => $action.'&client_id='.$this->credential('SLACK_CLIENT_ID').'&redirect_uri='.$this->slackRedirectUri(),
            'linear' => $this->linearAction($action),
            default => $action,
        };
    }

    public function isActive(Account $account): bool
    {
        $featureFlag = $this->params['feature_flag'] ?? null;

        if ($featureFlag !== null && ! $account->featureEnabled($featureFlag)) {
            return false;
        }

        foreach ($this->params['requires_config'] ?? [] as $key) {
            if (blank($this->credential($key))) {
                return false;
            }
        }

        return true;
    }

    // Integrations::App#enabled? — mỗi app đo bằng bảng lưu kết nối của nó.
    public function isEnabled(Account $account): bool
    {
        return match ($this->id()) {
            'webhook' => $account->webhooks()->exists(),
            'dashboard_apps' => $account->dashboardApps()->exists(),
            default => $account->hooks()->where('app_id', $this->id())->exists(),
        };
    }

    /** @return array<string, mixed> Các khoá cấu hình thô, chỉ trả cho administrator. */
    public function adminParams(): array
    {
        return collect($this->params)->except(['requires_config'])->all();
    }

    private function credential(string $key): ?string
    {
        return config("integration.credentials.{$key}");
    }

    private function slackRedirectUri(): string
    {
        return rtrim((string) config('app.url'), '/').'/app/accounts/'
            .(request()->attributes->get('currentAccount')?->id ?? '').'/settings/integrations/slack';
    }

    private function linearAction(string $action): string
    {
        return implode('&', [
            $action.'?response_type=code',
            'client_id='.$this->credential('LINEAR_CLIENT_ID'),
            'redirect_uri='.rtrim((string) config('app.url'), '/').'/linear/callback',
            'scope=read,write',
            'prompt=consent',
            'actor=app',
        ]);
    }
}
