<?php

// Bản dịch tiếng Việt của lang/en/compose_new_conversation.php.

return [
    'CONTACT_SEARCH' => [
        'ERROR_MESSAGE' => 'Chúng tôi không tìm kiếm được. Bạn hãy thử lại.',
    ],
    'CONTACT_CREATE' => [
        'ERROR_MESSAGE' => 'Chúng tôi không tạo được liên hệ. Bạn hãy thử lại.',
    ],
    'DRAFT' => [
        'TITLE' => 'Tin nhắn mới',
        'EMPTY' => 'Chưa có tin nhắn. Chọn người nhận và kênh gửi rồi soạn tin bên dưới.',
        'SENDING' => 'Đang mở hội thoại và gửi tin…',
        'COMPOSER_LOCKED' => 'Chọn người nhận và kênh gửi để bắt đầu soạn',
        'SUBJECT_LABEL' => 'Chủ đề:',
        'NEW_CONTACT_BADGE' => 'Liên hệ mới',
        'CREATE_CONTACT' => 'Tạo liên hệ mới: {address}',
        'CONTACT_LOAD_FAILED' => 'Không tải được liên hệ. Bạn hãy chọn lại người nhận.',
        'LOADING_CHANNELS' => 'Đang tìm kênh gửi được tới người này…',
        'LOAD_CHANNELS_FAILED' => 'Không tải được danh sách kênh gửi.',
        'RETRY' => 'Thử lại',
        'UNAVAILABLE' => [
            'MESSAGING_WINDOW_CLOSED' => 'Đã quá thời gian kênh cho phép nhắn kể từ tin cuối của khách',
            'REAUTHORIZATION_REQUIRED' => 'Kênh đang mất kết nối, cần đăng nhập lại',
            'OTHER' => 'Kênh này hiện không gửi được tới người này',
        ],
        'EMAIL_CHECK' => [
            'CHECKING' => 'Đang kiểm tra địa chỉ email…',
            'INVALID_SYNTAX' => 'Địa chỉ email sai định dạng — không gửi được.',
            'DOMAIN_NOT_FOUND' => 'Tên miền của địa chỉ này không tồn tại — thư sẽ không tới được.',
            'DOMAIN_NO_MAIL' => 'Tên miền của địa chỉ này không nhận thư — thư sẽ không tới được.',
            'UNDELIVERABLE' => 'Địa chỉ email này không nhận được thư.',
        ],
        'ERRORS' => [
            'NO_RECIPIENT' => 'Chọn người nhận trước khi gửi.',
            'NO_CHANNEL' => 'Chọn một kênh gửi được trước khi gửi.',
            'EMAIL_CHECKING' => 'Đang kiểm tra địa chỉ email, bạn chờ một chút rồi gửi.',
            'EMAIL_UNDELIVERABLE' => 'Địa chỉ email này không nhận được thư, hãy kiểm tra lại người nhận.',
            'SUBJECT_REQUIRED' => 'Thư email cần có chủ đề.',
        ],
    ],
    'FORM' => [
        'GO_TO_CONVERSATION' => 'Xem',
        'SUCCESS_MESSAGE' => 'Đã gửi tin nhắn!',
        'ERROR_MESSAGE' => 'Có lỗi khi tạo hội thoại. Bạn hãy thử lại sau.',
        'NO_INBOX_ALERT' => 'Không có hộp thư nào để bắt đầu hội thoại với liên hệ này.',
        'CONTACT_SELECTOR' => [
            'LABEL' => 'Đến:',
            'TAG_INPUT_PLACEHOLDER' => 'Nhập ít nhất 2 ký tự để tìm theo tên, email hoặc số điện thoại',
            'CONTACT_CREATING' => 'Đang tạo liên hệ...',
            'NO_RESULTS' => 'Không tìm thấy liên hệ nào',
            'CHANGE' => 'Đổi người nhận',
        ],
        'INBOX_SELECTOR' => [
            'LABEL' => 'Gửi qua:',
            'PICK_CONTACT_FIRST' => 'Chọn người nhận để xem các hộp thư gửi được',
        ],
        'EMAIL_OPTIONS' => [
            'SUBJECT_LABEL' => 'Chủ đề :',
            'SUBJECT_PLACEHOLDER' => 'Nhập tiêu đề email tại đây',
            'CC_LABEL' => 'Cc:',
            'CC_PLACEHOLDER' => 'Nhập ít nhất 2 ký tự để tìm theo email',
            'BCC_LABEL' => 'Bcc:',
            'BCC_PLACEHOLDER' => 'Nhập ít nhất 2 ký tự để tìm theo email',
            'BCC_BUTTON' => 'Bcc',
        ],
        'MESSAGE_EDITOR' => [
            'PLACEHOLDER' => 'Viết tin nhắn ở đây...',
        ],
        'WHATSAPP_OPTIONS' => [
            'LABEL' => 'Chọn mẫu tin',
            'SEARCH_PLACEHOLDER' => 'Tìm mẫu tin',
            'EMPTY_STATE' => 'Không có mẫu tin nào',
            'TEMPLATE_PARSER' => [
                'TEMPLATE_NAME' => 'Mẫu tin WhatsApp: {templateName}',
                'VARIABLES' => 'Biến',
                'BACK' => 'Trở về',
                'SEND_MESSAGE' => 'Gửi tin nhắn',
            ],
        ],
        'TWILIO_OPTIONS' => [
            'LABEL' => 'Chọn mẫu tin',
            'SEARCH_PLACEHOLDER' => 'Tìm mẫu tin',
            'EMPTY_STATE' => 'Không có mẫu tin nào',
            'TEMPLATE_PARSER' => [
                'BACK' => 'Trở về',
                'SEND_MESSAGE' => 'Gửi tin nhắn',
            ],
        ],
        'ACTION_BUTTONS' => [
            'DISCARD' => 'Bỏ',
            'SEND' => 'Gửi ({keyCode})',
        ],
    ],
];
