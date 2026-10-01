<?php

namespace App\Services\ProductEvents;

// Danh mục sự kiện sản phẩm: tên là giá trị lưu ở product_events.name (đổi tên là
// mất lịch sử, chỉ thêm mới). Nhóm "activation" là các mốc kích hoạt của account,
// "feature" là lượt dùng tính năng; lượt làm hộ của super admin không tính là
// tenant dùng tính năng (ProductEventRecorder bỏ qua nhóm này khi đó).
enum ProductEventName: string
{
    case AccountSignedUp = 'account_signed_up';
    case EmailConfirmed = 'email_confirmed';
    case OnboardingStepCompleted = 'onboarding_step_completed';
    case InboxCreated = 'inbox_created';
    case ChannelConnected = 'channel_connected';
    case FirstInboundMessage = 'first_inbound_message';
    case FirstOutboundReply = 'first_outbound_reply';

    case MacroRun = 'macro_run';
    case AutomationRuleCreated = 'automation_rule_created';
    case AutomationRuleFired = 'automation_rule_fired';
    case CannedResponseUsed = 'canned_response_used';
    case CampaignCreated = 'campaign_created';
    case HelpCenterArticlePublished = 'help_center_article_published';
    case StickerSent = 'sticker_sent';
    case StickerUploaded = 'sticker_uploaded';
    case StructuredMessageSent = 'structured_message_sent';
    case ContactsImported = 'contacts_imported';
    case ContactsExported = 'contacts_exported';
    case LabelCreated = 'label_created';
    case WebhookCreated = 'webhook_created';
    case AgentBotConnected = 'agent_bot_connected';

    public const GROUP_ACTIVATION = 'activation';

    public const GROUP_FEATURE = 'feature';

    public function group(): string
    {
        return match ($this) {
            self::AccountSignedUp, self::EmailConfirmed, self::OnboardingStepCompleted, self::InboxCreated,
            self::ChannelConnected, self::FirstInboundMessage, self::FirstOutboundReply => self::GROUP_ACTIVATION,
            default => self::GROUP_FEATURE,
        };
    }

    public function isFeature(): bool
    {
        return $this->group() === self::GROUP_FEATURE;
    }

    public function label(): string
    {
        return (string) __("admin_operations.PRODUCT_EVENTS.NAMES.{$this->value}");
    }
}
