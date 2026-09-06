<?php

namespace App\Jobs\Integrations;

use App\Jobs\ApplicationJob;
use App\Models\Integrations\Hook;
use App\Services\Integrations\Slack\SlackApiException;
use App\Services\Integrations\Slack\SlackClient;
use App\Services\Integrations\Slack\SlackLinkUnfurlService;
use Illuminate\Support\Facades\Log;

// Port từ refs/chatwoot/app/jobs/slack_unfurl_job.rb — chỉ unfurl nếu bot Slack
// còn quyền truy cập kênh đã chia sẻ link (tránh lộ preview cho kênh riêng tư
// mà bot không ở trong đó, hoặc kênh của account khác).
class SlackUnfurlJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params)
    {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        $hook = $this->resolveIntegrationHook();

        if ($hook === null || ! $this->channelHasAccess($hook)) {
            return;
        }

        (new SlackLinkUnfurlService($this->params, $hook))->perform();
    }

    // Lấy account_id từ link đầu tiên trong sự kiện — cùng giả định "mọi link
    // trong sự kiện thuộc cùng một account" như bản gốc (TODO của chính Chatwoot).
    private function resolveIntegrationHook(): ?Hook
    {
        $url = data_get($this->params, 'event.links.0.url');

        if ($url === null || ! preg_match('#/accounts/(\d+)#', $url, $matches)) {
            return null;
        }

        return Hook::query()->where('account_id', $matches[1])->where('app_id', 'slack')->first();
    }

    private function channelHasAccess(Hook $hook): bool
    {
        try {
            $response = (new SlackClient($hook->access_token))->conversationsMembers(data_get($this->params, 'event.channel'));

            return ($response['ok'] ?? false) === true;
        } catch (SlackApiException $e) {
            // Link riêng tư hoặc kênh của account khác không unfurl được — bỏ
            // qua trong im lặng, giống bản gốc chỉ log rồi trả false.
            Log::error("Exception in SlackUnfurlJob: {$e->getMessage()}");

            return false;
        }
    }
}
