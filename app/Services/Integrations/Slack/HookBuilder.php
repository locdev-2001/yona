<?php

namespace App\Services\Integrations\Slack;

use App\Models\Account;
use App\Models\Integrations\Hook;

// Đổi `code` OAuth
// lấy access_token rồi tạo hook Slack ở trạng thái TẮT. ChannelBuilder@update sẽ
// bật hook khi admin chọn xong kênh (list_all_channels → update).
class HookBuilder
{
    public function __construct(
        private readonly Account $account,
        private readonly string $code,
        private readonly ?int $inboxId = null,
    ) {}

    public function perform(): Hook
    {
        return $this->account->hooks()->create([
            'access_token' => $this->fetchAccessToken(),
            'status' => Hook::STATUS_DISABLED,
            'inbox_id' => $this->inboxId,
            'app_id' => 'slack',
        ]);
    }

    private function fetchAccessToken(): ?string
    {
        $response = (new SlackClient)->oauthV2Access(
            (string) config('integration.credentials.SLACK_CLIENT_ID'),
            (string) config('integration.credentials.SLACK_CLIENT_SECRET'),
            $this->code,
            $this->redirectUri(),
        );

        return $response['access_token'] ?? null;
    }

    // Integrations::App.slack_integration_url — cùng URL redirect đã dùng khi
    // dựng link "Add to Slack" (App::action(), quyết định #d4).
    private function redirectUri(): string
    {
        return rtrim((string) config('app.url'), '/').'/app/accounts/'.$this->account->id.'/settings/integrations/slack';
    }
}
