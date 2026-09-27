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
        'unsupported_file_type' => 'Only Lottie (.json) or .tgs stickers are accepted.',
        'file_too_large' => 'Sticker files can be at most :max_upload_kb KB.',
        'file_unreadable' => 'The uploaded file could not be read, please try again.',
        'invalid_gzip' => 'This .tgs file is damaged and cannot be decompressed.',
        'decompressed_too_large' => 'The sticker exceeds :max_decompressed_kb KB once decompressed.',
        'invalid_json' => 'The file is not valid JSON.',
        'nesting_too_deep' => 'The sticker structure is nested too deeply.',
        'invalid_lottie' => 'The file is not a valid Lottie animation.',
        'canvas_too_large' => 'Stickers can be at most :max_canvas×:max_canvas px.',
        'frame_rate_too_high' => 'Stickers can have at most :max_frame_rate frames per second.',
        'duration_too_long' => 'Stickers can be at most :max_seconds seconds long.',
        'text_not_allowed' => 'Stickers cannot contain text layers or fonts. Convert text to shapes before exporting.',
        'expression_not_allowed' => 'Stickers cannot use expressions. Bake expressions into keyframes before exporting.',
        'embedded_image_not_allowed' => 'Stickers cannot embed bitmap images, only vector shapes.',
        'external_image_not_allowed' => 'Stickers cannot load images from elsewhere, only vector shapes.',
        'precomp_cycle' => 'The sticker has precomps that reference each other in a loop.',
        'precomp_too_deep' => 'The sticker nests precomps more than :max_precomp_depth levels deep.',
        'too_many_layers' => 'The sticker has too many layers (at most :max_layers).',
        'too_many_shapes' => 'The sticker has too many shapes (at most :max_shapes).',
        'repeater_too_large' => 'A repeater in the sticker makes more than :max_repeater_copies copies.',
        'polystar_too_complex' => 'A star or polygon in the sticker has more than :max_polystar_points points.',
        'render_failed' => 'A preview could not be rendered for this sticker.',
        'render_timeout' => 'The sticker is too complex and took too long to render.',
        'renderer_unavailable' => 'Sticker previews cannot be rendered right now, please try again later.',
        'storage_write_failed' => 'The sticker files could not be saved, please try again later.',
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
