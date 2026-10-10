<?php

// Port từ config/locales/en.yml khối `errors:` (chuỗi backend, không có
// namespace FE tương ứng) — cùng lối với lang/en/contacts.php.
return [
    'webhook' => [
        'invalid' => 'Invalid events',
    ],
    'openai' => [
        'invalid_api_key' => 'OpenAI API key is invalid or revoked. Please check your key in your OpenAI dashboard.',
    ],
    'dyte' => [
        'invalid_message_type' => 'Invalid message type. Action not permitted',
        'realtimekit_credentials_required' => 'Cloudflare RealtimeKit credentials are required. Delete the existing Dyte integration and create it again with Cloudflare RealtimeKit credentials.',
    ],
    'slack' => [
        'invalid_channel_id' => 'Invalid slack channel. Please try again',
    ],
    'reports' => [
        'date_range_too_long' => 'Date range cannot exceed 6 months',
    ],
    'conversations' => [
        'resolved' => 'Conversation is resolved and does not accept new messages',
        'contact_unreachable' => 'This contact has no address this inbox can send to',
        'email_undeliverable' => 'Cannot send email to :email: :reason',
    ],
    'email_addresses' => [
        'invalid_syntax' => 'the email address is malformed',
        'domain_not_found' => 'the domain does not exist',
        'domain_no_mail' => 'this domain does not accept email',
    ],
    'messages' => [
        'email_bounced' => 'The address :email cannot receive email: :reason',
        'email_bounced_without_reason' => 'The address :email cannot receive email, the receiving server returned the message',
        'email_send_failed' => 'The mail server refused to send: :reason',
        'email_send_failed_unknown' => 'Could not send the email through this inbox mail server',
    ],
    'custom_filters' => [
        'number_of_records' => 'Limit reached. The maximum number of allowed custom filters for a user per account is 1000.',
        'invalid_attribute' => 'Invalid attribute key - [:key]. The key should be one of [:allowed_keys] or a custom attribute defined in the account.',
        'invalid_operator' => 'Invalid operator. The allowed operators for :attribute_name are [:allowed_keys].',
        'invalid_query_operator' => 'Query operator must be either "AND" or "OR".',
        'invalid_value' => 'Invalid value. The values provided for :attribute_name are invalid',
    ],
    'mfa' => [
        'already_enabled' => 'MFA is already enabled',
        'not_enabled' => 'MFA is not enabled',
        'invalid_code' => 'Invalid verification code',
        'invalid_backup_code' => 'Invalid backup code',
        'invalid_token' => 'Invalid or expired MFA token',
        'invalid_credentials' => 'Invalid credentials or verification code',
    ],
    // Đặt ở đây thay vì `profile_settings.sessions` để không đụng
    // namespace PROFILE_SETTINGS của bundle FE (lang/en/profile_settings.php).
    'sessions' => [
        'cannot_revoke_current' => 'You cannot revoke the current session.',
    ],
    'contacts' => [
        'phone_number_invalid' => 'Phone number is invalid. Enter a local number like 0912 345 678, or an international number with its country code like +1 202 555 0123.',
        'email_taken' => 'Email has already been taken',
        'phone_number_taken' => 'Phone number has already been taken',
        'identifier_taken' => 'Identifier has already been taken',
        'import' => [
            'failed' => 'File is blank',
        ],
        'export' => [
            'success' => 'We will notify you once contacts export file is ready to view.',
        ],
    ],
    // Kênh Zalo cá nhân — lý do gửi hỏng, khớp `content_attributes.external_error.code`
    // (App\Services\Zalo\SendOnZaloService). FE dùng `code` để chọn hành động,
    // `message` để hiện cho agent.
    'zalo' => [
        'send' => [
            'circuit_open' => 'The Zalo connection keeps failing, sending is paused for a moment.',
            'session_lost' => 'The Zalo session has ended, please scan the QR code again.',
            'bridge_unreachable' => 'Could not reach the Zalo service, please try again in a moment.',
            'secret_mismatch' => 'The Zalo service is misconfigured (send secret), please contact the administrator.',
            'zalo_rejected' => 'Zalo refused this message (:detail).',
            'media_fetch_failed' => 'The attachment could not be read to send (:detail).',
            'unknown' => 'This message could not be sent to Zalo (:detail).',
            'attachment_failed' => 'Could not send the file ":filename": :reason',
        ],
        'action' => [
            'session_lost' => 'The Zalo session has ended, please scan the QR code again.',
            'bridge_unreachable' => 'Could not reach the Zalo service, please try again in a moment.',
            'secret_mismatch' => 'The Zalo service is misconfigured (send secret), please contact the administrator.',
            'zalo_rejected' => 'Zalo refused this action (:detail).',
            'bad_request' => 'Zalo could not identify this message any more (:detail).',
            'missing_source_id' => 'This message has not reached Zalo yet, so it cannot be changed there.',
            'emoji_not_supported' => 'Zalo does not have this reaction.',
            'unknown' => 'This action did not go through to Zalo (:detail).',
        ],
    ],
    // Bảng chọn sticker và tin sticker (App\Services\Channels\Stickers). Lỗi phía
    // kênh dùng lại câu của từng kênh; ở đây chỉ là luật chung của lõi.
    'stickers' => [
        'capability_not_supported' => 'This channel cannot send stickers.',
        'not_found' => 'This sticker could not be found, please pick another one.',
        'bad_request' => 'That sticker search could not be understood, please try another keyword.',
        'private_note' => 'Stickers cannot be added to a private note.',
        'outgoing_only' => 'Stickers can only be sent as a reply.',
        'with_attachments' => 'A sticker is sent on its own, without attachments.',
        'missing_sticker_id' => 'Pick a sticker to send.',
    ],
    'sticker_uploads' => [
        'unsupported_file_type' => 'Only PNG, JPG, WebP or GIF images are accepted.',
        'file_too_large' => 'Uploaded images can be at most :max_upload_mb MB.',
        'file_unreadable' => 'The uploaded file could not be read, please try again.',
        'invalid_edit' => 'The sticker image settings are invalid. Adjust them and upload again.',
        'image_unreadable' => 'This image could not be read. Save it as PNG or JPG and upload again.',
        'image_too_large' => 'This image is too large for a sticker (too many pixels or too long an animation). Shrink or shorten it and upload again.',
        'too_many_frames' => 'This animation has too many frames. Trim it and upload again.',
        'image_empty' => 'Nothing is left after removing the background. Lower the removal sensitivity or turn background removal off.',
        'original_missing' => 'The original image of this sticker is gone, please upload it again.',
        'sticker_busy' => 'This sticker is still being rendered, please wait a few seconds and edit it again.',
        'duplicate_in_pack' => 'This pack already has an identical sticker with these edits.',
        'render_failed' => 'A sticker could not be made from this image.',
        'render_timeout' => 'This image took too long to process. Try a smaller image or one with fewer frames.',
        'renderer_unavailable' => 'Stickers cannot be made right now, please try again later.',
        'storage_write_failed' => 'The sticker files could not be saved, please try again later.',
    ],
    'sticker_library' => [
        'pack_full' => 'A pack holds at most :max stickers. Remove some or create a new pack.',
        'too_many_packs' => 'An account can have at most :max sticker packs.',
        'upload_throttled' => 'Too many sticker uploads at once. Please wait a moment and try again.',
        'forbidden' => 'Your account is not allowed to use this sticker library.',
        'label_too_long' => 'Labels can be at most :max characters.',
        'too_many_keywords' => 'Use at most :max keywords.',
        'keyword_not_text' => 'Keywords must be text.',
        'keyword_too_long' => 'The keyword “:input” is longer than :max characters.',
        'pack_name_required' => 'Give the sticker pack a name.',
        'pack_name_too_long' => 'Pack names can be at most :max characters.',
        'invalid_destination' => 'The destination must be the account library or the platform library.',
    ],
    'widget_recall' => [
        'capability_not_supported' => 'This channel does not support unsending messages.',
        'not_own_message' => 'You can only unsend your own messages.',
        'already_recalled' => 'This message was already unsent.',
        'recall_window_expired' => 'The time limit for unsending this message has passed.',
    ],
    'forward' => [
        'not_forwardable' => 'This type of message cannot be forwarded yet.',
        'attachment_unavailable' => 'The file :filename is no longer on the server, so it cannot be forwarded.',
        'capability_not_supported' => 'The :inbox inbox cannot send :items.',
        'sticker_unavailable' => 'The :inbox inbox cannot send this sticker.',
        'reply_window_closed' => 'The reply window for this conversation has closed.',
        'target_not_found' => 'Conversation not found or you do not have access to it.',
        'no_targets' => 'Choose at least one conversation.',
        'too_many_targets' => 'You can forward to at most :max conversations at a time.',
        'capabilities' => [
            'outbound_text' => 'text messages',
            'outbound_image' => 'images',
            'outbound_video' => 'videos',
            'outbound_audio' => 'audio',
            'outbound_file' => 'files',
            'outbound_sticker' => 'stickers',
        ],
    ],
    'custom_attribute_definition' => [
        'attribute_key_format' => 'must only contain letters, numbers, underscores, hyphens, and dots',
        'key_conflict' => 'The provided key is not allowed as it might conflict with default attributes.',
    ],
];
