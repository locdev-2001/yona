<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\InstallationConfig;
use App\Support\SuperAdmin\ConsoleNavigation;
use App\Support\SuperAdminArea;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Mỗi mục cài đặt chỉ cho sửa đúng danh sách khoá của nó.
class AppConfigsController extends Controller
{
    private const GENERAL_CONFIGS = [
        'FIREBASE_PROJECT_ID', 'FIREBASE_CREDENTIALS',
        'WEBHOOK_TIMEOUT', 'MAXIMUM_FILE_UPLOAD_SIZE', 'WIDGET_TOKEN_EXPIRY',
    ];

    // mapping của bản gốc, bỏ các mục chỉ có trên bản enterprise/cloud.
    private const CONFIG_SECTIONS = [
        'facebook' => ['FB_APP_ID', 'FB_VERIFY_TOKEN', 'FB_APP_SECRET', 'IG_VERIFY_TOKEN', 'FACEBOOK_API_VERSION'],
        'shopify' => ['SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET'],
        'microsoft' => ['AZURE_APP_ID', 'AZURE_APP_SECRET'],
        'email' => ['MAILER_INBOUND_EMAIL_DOMAIN', 'ACCOUNT_EMAILS_LIMIT', 'ACCOUNT_EMAILS_PLAN_LIMITS'],
        'slack' => ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
        'instagram' => ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_VERIFY_TOKEN', 'INSTAGRAM_API_VERSION'],
        'tiktok' => ['TIKTOK_APP_ID', 'TIKTOK_APP_SECRET', 'TIKTOK_API_VERSION'],
        'whatsapp_embedded' => ['WHATSAPP_APP_ID', 'WHATSAPP_APP_SECRET', 'WHATSAPP_CONFIGURATION_ID', 'WHATSAPP_API_VERSION'],
        'google' => ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REDIRECT_URI'],
    ];

    public function show(Request $request): Response
    {
        $section = (string) $request->query('config', 'general');
        $allowed = $this->allowedConfigs($section);

        return Inertia::render('superadmin/AppConfig', [
            'config' => $section,
            'title' => ConsoleNavigation::appConfigSectionTitle($section),
            'values' => InstallationConfig::query()->whereIn('name', $allowed)->get()
                ->mapWithKeys(fn (InstallationConfig $item) => [$item->name => $item->value])->all(),
            'definitions' => $this->definitions($allowed),
            'strings' => [
                'title' => __('admin_layout.app_config.page_title'),
                'description' => __('admin_layout.app_config.page_description'),
                'defaultValue' => __('admin_layout.app_config.default_value'),
                'unsetValue' => __('admin_layout.app_config.unset_value'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $section = (string) $request->input('config', 'general');
        $allowed = $this->allowedConfigs($section);
        $restartRequired = false;

        foreach ((array) $request->input('app_config', []) as $name => $value) {
            if (! in_array($name, $allowed, true)) {
                continue;
            }

            $config = InstallationConfig::query()->firstOrNew(['name' => $name]);
            $config->value = $value;
            $config->locked = false;
            $config->save();

            $restartRequired = $restartRequired || in_array($name, InstallationConfig::RESTART_REQUIRED_CONFIG_KEYS, true);
        }

        $message = __('admin_layout.flash.settings_updated');

        // Lưu xong ở lại đúng mục vừa sửa.
        return redirect(SuperAdminArea::url('app_config?config='.(in_array($section, self::sections(), true) ? $section : 'general')))->with(
            'notice',
            $restartRequired ? $message.' '.__('admin_layout.flash.restart_required') : $message,
        );
    }

    /** @return list<string> */
    public static function sections(): array
    {
        return ['general', ...array_keys(self::CONFIG_SECTIONS)];
    }

    /** @return list<string> */
    private function allowedConfigs(string $section): array
    {
        return self::CONFIG_SECTIONS[$section] ?? self::GENERAL_CONFIGS;
    }

    /**
     * Metadata (kiểu nhập, giá trị mặc định) lấy từ config/installation_config.php;
     * nhãn và mô tả lấy bản dịch admin_layout.app_config.fields theo khoá, thiếu
     * thì dùng chữ gốc trong config.
     */
    private function definitions(array $allowed): array
    {
        return collect(config('installation_config'))
            ->filter(fn (array $definition) => in_array($definition['name'], $allowed, true))
            ->mapWithKeys(function (array $definition) {
                $name = $definition['name'];
                $translated = (array) __("admin_layout.app_config.fields.{$name}");
                $default = $definition['value'] ?? null;

                return [$name => [
                    'display_title' => ($translated['title'] ?? '') ?: ($definition['display_title'] ?? $name),
                    'description' => array_key_exists('description', $translated)
                        ? (string) $translated['description']
                        : ($definition['description'] ?? ''),
                    'type' => $definition['type'] ?? 'text',
                    'options' => $definition['options'] ?? null,
                    'default' => is_scalar($default) ? (string) $default : null,
                ]];
            })
            ->all();
    }
}
