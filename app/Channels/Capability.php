<?php

namespace App\Channels;

/**
 * Bộ năng lực chung của mọi kênh tin nhắn — docs/channel-capabilities.md §2.
 *
 * Giá trị chuỗi là hợp đồng công khai: nằm trong payload API, webhook và code FE.
 * Đổi tên case thì tự do, đổi GIÁ TRỊ là breaking change (docs/code-standards.md §0.6).
 * Lõi và UI chỉ được hỏi năng lực qua enum này, không rẽ nhánh theo `channel_type`.
 */
enum Capability: string
{
    // §2.1 Nội dung tin đến
    case InboundText = 'inbound_text';
    case InboundRichText = 'inbound_rich_text';
    case InboundImage = 'inbound_image';
    case InboundGif = 'inbound_gif';
    case InboundVideo = 'inbound_video';
    case InboundAudio = 'inbound_audio';
    case InboundFile = 'inbound_file';
    case InboundSticker = 'inbound_sticker';
    case InboundLocation = 'inbound_location';
    case InboundContactCard = 'inbound_contact_card';
    case InboundBankCard = 'inbound_bank_card';
    case InboundReminder = 'inbound_reminder';
    case InboundCallLog = 'inbound_call_log';
    case InboundLinkPreview = 'inbound_link_preview';
    case InboundCaption = 'inbound_caption';
    case InboundForward = 'inbound_forward';
    // Khách trích dẫn một tin: driver đặt `in_reply_to_external_id` (+ ảnh chụp `in_reply_to_preview`), lõi suy id nội bộ.
    case InboundReplyTo = 'inbound_reply_to';

    // §2.2 Nội dung tin đi
    case OutboundText = 'outbound_text';
    case OutboundImage = 'outbound_image';
    // Gửi được GIF như ảnh động giữ đúng cỡ (không coi là ảnh chụp để phóng to).
    case OutboundGif = 'outbound_gif';
    case OutboundVideo = 'outbound_video';
    case OutboundAudio = 'outbound_audio';
    // Gửi bản ghi âm thành tin thoại gốc của nền tảng (phát ngay trong khung chat), không phải một tệp âm thanh.
    case OutboundVoice = 'outbound_voice';
    case OutboundFile = 'outbound_file';
    case OutboundSticker = 'outbound_sticker';
    // Gửi sticker của kho Yona thành sticker gốc cỡ gọn của nền tảng (không phải một ảnh).
    case OutboundCustomSticker = 'outbound_custom_sticker';
    case OutboundLocation = 'outbound_location';
    case OutboundContactCard = 'outbound_contact_card';
    case OutboundReplyTo = 'outbound_reply_to';
    case OutboundMention = 'outbound_mention';
    case OutboundReaction = 'outbound_reaction';
    case OutboundRecall = 'outbound_recall';
    case OutboundEdit = 'outbound_edit';
    case OutboundTyping = 'outbound_typing';
    case OutboundReadReceipt = 'outbound_read_receipt';
    case OutboundRetry = 'outbound_retry';
    case OutboundQuickReply = 'outbound_quick_reply';
    case OutboundButtons = 'outbound_buttons';
    case OutboundCard = 'outbound_card';

    // §2.3 Sự kiện đến
    case EventDelivered = 'event_delivered';
    case EventSeen = 'event_seen';
    case EventReaction = 'event_reaction';
    case EventRecall = 'event_recall';
    case EventEdit = 'event_edit';
    case EventTyping = 'event_typing';
    case EventPresence = 'event_presence';

    // §2.4 Định danh & hồ sơ
    case ProfileName = 'profile_name';
    case ProfileAvatar = 'profile_avatar';
    case ProfilePhone = 'profile_phone';
    case ProfileEmail = 'profile_email';
    case ProfileRefresh = 'profile_refresh';
    case IdentityStableId = 'identity_stable_id';
    case GroupThreads = 'group_threads';
    case FriendRequest = 'friend_request';

    // §2.5 Hội thoại & phiên
    case ThreadingContinuous = 'threading_continuous';
    case MessagingWindow = 'messaging_window';
    // Người trực chủ động mở hội thoại mới tới một liên hệ: kênh tự suy địa chỉ gửi từ hồ sơ liên hệ.
    case ConversationOutboundStart = 'conversation_outbound_start';
    case SessionQr = 'session_qr';
    case SessionToken = 'session_token';
    case SessionOauth = 'session_oauth';
    case SessionReauth = 'session_reauth';
    case SessionDisconnect = 'session_disconnect';
    case Health = 'health';

    // §2.6 Cấu hình hộp thư: phần cài đặt kênh có thật VÀ lõi áp dụng nó. Trang cài đặt
    // hộp thư chỉ dựng tab/khối theo các năng lực này, không rẽ nhánh theo `channel_type`.
    // Khách nhắn lại sau khi hội thoại đã xong: mở lại hội thoại cũ hay tạo mới (`lock_to_single_conversation`).
    case SettingsSingleConversation = 'settings_single_conversation';
    // URL nhận sự kiện của hệ ngoài + khoá ký.
    case SettingsWebhook = 'settings_webhook';
    // Mã hộp thư + khoá HMAC cho Client API.
    case SettingsClientApi = 'settings_client_api';
    // Giao diện, hành vi, mã nhúng, tên miền được phép và xác minh danh tính của widget.
    case SettingsWebWidget = 'settings_web_widget';
    case SettingsPreChatForm = 'settings_pre_chat_form';
    // Tên người gửi hiện trong thư đi.
    case SettingsSenderName = 'settings_sender_name';
    // Hộp thư tự cấu hình: địa chỉ chuyển tiếp, IMAP, SMTP (không qua OAuth của nhà cung cấp).
    case SettingsMailServer = 'settings_mail_server';

    /** @return list<string> Giá trị của mọi năng lực, đúng thứ tự khai báo. */
    public static function allValues(): array
    {
        return array_map(static fn (self $capability) => $capability->value, self::cases());
    }
}
