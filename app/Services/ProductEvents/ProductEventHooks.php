<?php

namespace App\Services\ProductEvents;

use App\Channels\Capability;
use App\Channels\DeclaresCapabilities;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBotInbox;
use App\Models\Article;
use App\Models\AutomationRule;
use App\Models\Campaign;
use App\Models\DataImport;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\User;
use App\Models\Webhook;
use App\Services\Admin\Metrics\ChannelTypes;
use Closure;
use Throwable;

/**
 * Sự kiện sản phẩm suy từ vòng đời model: bản ghi được tạo (hộp thư, nhãn,
 * webhook…) hay đổi trạng thái (onboarding, xác nhận email, bài viết xuất bản).
 * Đăng ký một lần ở ProductEventServiceProvider. Khoá chống trùng theo id bản
 * ghi trùng với khoá của lệnh dựng lại (product-events:backfill).
 */
final class ProductEventHooks
{
    // Kênh mà lúc tạo hộp thư đã là lúc kết nối xong (token/OAuth đã được nền
    // tảng chấp nhận). Kênh quét QR, IMAP, widget ghi ở điểm kết nối thật của nó.
    private const CONNECTED_AT_CREATION = [
        'token' => Capability::SessionToken,
        'oauth' => Capability::SessionOauth,
    ];

    public function __construct(
        private readonly ProductEventRecorder $recorder,
        private readonly ChannelTypes $channelTypes,
    ) {}

    public function register(): void
    {
        Account::updated(self::safely(fn (Account $account) => $this->onboardingAdvanced($account)));
        User::updated(self::safely(fn (User $user) => $this->emailConfirmed($user)));
        Inbox::created(self::safely(fn (Inbox $inbox) => $this->inboxCreated($inbox)));

        Label::created(self::safely(fn (Label $label) => $this->recorder->record(
            ProductEventName::LabelCreated, $label->account_id, ['label_id' => $label->id], dedupeKey: "label_created:{$label->id}",
        )));
        Webhook::created(self::safely(fn (Webhook $webhook) => $this->recorder->record(
            ProductEventName::WebhookCreated, $webhook->account_id, ['webhook_id' => $webhook->id, 'inbox_id' => $webhook->inbox_id],
            dedupeKey: "webhook_created:{$webhook->id}",
        )));
        AgentBotInbox::created(self::safely(fn (AgentBotInbox $connection) => $this->recorder->record(
            ProductEventName::AgentBotConnected, $connection->account_id ?? $connection->inbox?->account_id,
            ['agent_bot_id' => $connection->agent_bot_id, 'inbox_id' => $connection->inbox_id],
            dedupeKey: "agent_bot_connected:{$connection->id}",
        )));
        Campaign::created(self::safely(fn (Campaign $campaign) => $this->recorder->record(
            ProductEventName::CampaignCreated, $campaign->account_id,
            ['campaign_id' => $campaign->id, 'platform' => $this->channelTypes->platform($campaign->inbox?->channel_type)->key],
            dedupeKey: "campaign_created:{$campaign->id}",
        )));
        AutomationRule::created(self::safely(fn (AutomationRule $rule) => $this->recorder->record(
            ProductEventName::AutomationRuleCreated, $rule->account_id, ['automation_rule_id' => $rule->id, 'event' => $rule->event_name],
            dedupeKey: "automation_rule_created:{$rule->id}",
        )));
        DataImport::created(self::safely(fn (DataImport $import) => $this->recorder->record(
            ProductEventName::ContactsImported, $import->account_id, ['data_import_id' => $import->id],
            dedupeKey: "contacts_imported:{$import->id}",
        )));
        Sticker::created(self::safely(fn (Sticker $sticker) => $this->stickerUploaded($sticker)));
        Article::saved(self::safely(fn (Article $article) => $this->articleSaved($article)));
    }

    private function onboardingAdvanced(Account $account): void
    {
        if (! $account->wasChanged('custom_attributes')) {
            return;
        }

        $before = $account->getOriginal('custom_attributes')[Account::ONBOARDING_STEP_KEY] ?? null;
        if (! is_string($before) || $before === $account->onboardingStep()) {
            return;
        }

        $this->recorder->record(
            ProductEventName::OnboardingStepCompleted,
            $account,
            ['step' => $before],
            dedupeKey: "onboarding_step_completed:{$account->id}:{$before}",
        );
    }

    private function emailConfirmed(User $user): void
    {
        if (! $user->wasChanged('confirmed_at') || $user->confirmed_at === null || $user->getOriginal('confirmed_at') !== null) {
            return;
        }

        foreach (AccountUser::query()->where('user_id', $user->id)->pluck('account_id') as $accountId) {
            $this->recordEmailConfirmed((int) $accountId, $user);
        }
    }

    public function recordEmailConfirmed(int $accountId, User $user): void
    {
        $this->recorder->record(
            ProductEventName::EmailConfirmed,
            $accountId,
            [],
            $user,
            $user->confirmed_at,
            "email_confirmed:{$accountId}:{$user->id}",
        );
    }

    private function inboxCreated(Inbox $inbox): void
    {
        $platform = $this->channelTypes->platform($inbox->channel_type)->key;

        $this->recorder->record(
            ProductEventName::InboxCreated,
            $inbox->account_id,
            ['inbox_id' => $inbox->id, 'platform' => $platform],
            dedupeKey: "inbox_created:{$inbox->id}",
        );

        $channel = $inbox->channel;
        if (! $channel instanceof DeclaresCapabilities) {
            return;
        }

        foreach (self::CONNECTED_AT_CREATION as $method => $capability) {
            if ($channel->capabilities()->has($capability)) {
                $this->channelConnected($inbox, $method);

                return;
            }
        }
    }

    /**
     * Một hộp thư đã nối được với nền tảng: quét QR xong, IMAP lấy thư được lần
     * đầu, widget chạy trên website của khách, hay token/OAuth được chấp nhận.
     */
    public function channelConnected(Inbox $inbox, string $method): void
    {
        $this->recorder->recordOnce(
            ProductEventName::ChannelConnected,
            $inbox->account_id,
            "channel_connected:{$inbox->id}:{$method}",
            fn () => [
                'inbox_id' => $inbox->id,
                'platform' => $this->channelTypes->platform($inbox->channel_type)->key,
                'method' => $method,
            ],
        );
    }

    // Chỉ kho riêng của account; kho nền tảng là việc của Yona, không phải tenant dùng tính năng.
    private function stickerUploaded(Sticker $sticker): void
    {
        $accountId = StickerPack::query()->whereKey($sticker->sticker_pack_id)->value('account_id');
        if ($accountId === null) {
            return;
        }

        $this->recorder->record(
            ProductEventName::StickerUploaded,
            (int) $accountId,
            ['sticker_pack_id' => $sticker->sticker_pack_id],
            dedupeKey: "sticker_uploaded:{$sticker->id}",
        );
    }

    // Lần đầu bài viết lên trạng thái xuất bản (tạo thẳng ở trạng thái đó hoặc đổi sang).
    private function articleSaved(Article $article): void
    {
        if (! $article->isPublished() || (! $article->wasRecentlyCreated && ! $article->wasChanged('status'))) {
            return;
        }

        $this->recorder->record(
            ProductEventName::HelpCenterArticlePublished,
            $article->account_id,
            ['article_id' => $article->id, 'portal_id' => $article->portal_id],
            dedupeKey: "help_center_article_published:{$article->id}",
        );
    }

    // Hook model chạy giữa luồng nghiệp vụ: lỗi ghi sự kiện không bao giờ được lọt ra.
    private static function safely(Closure $hook): Closure
    {
        return function (...$arguments) use ($hook): void {
            try {
                $hook(...$arguments);
            } catch (Throwable $exception) {
                report($exception);
            }
        };
    }
}
