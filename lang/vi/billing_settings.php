<?php

// Bản dịch tiếng Việt của lang/en/billing_settings.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'TITLE' => 'Phí',
    'DESCRIPTION' => 'Quản lý gói dịch vụ tại đây, nâng cấp gói để đội của bạn có thêm nhiều tính năng.',
    'CURRENT_PLAN' => [
        'TITLE' => 'Gói hiện tại',
        'PLAN_NOTE' => 'Bạn hiện đã đăng ký gói **{plan}** với **{quantity}** giấy phép',
        'SEAT_COUNT' => 'Số chỗ ngồi',
        'RENEWS_ON' => 'Gia hạn vào',
        'CURRENCY' => 'Loại tiền',
    ],
    'CURRENCY' => [
        'SELECT' => [
            'TITLE' => 'Chọn loại tiền thanh toán',
            'DESCRIPTION' => 'Chọn loại tiền bạn muốn dùng để thanh toán. Không đổi được sau khi gói đã tạo.',
        ],
        'OPTIONS' => [
            'USD' => 'Đô la Mỹ (USD)',
            'BRL' => 'Real Brazil (BRL)',
        ],
    ],
    'VIEW_PRICING' => 'Xem bảng giá',
    'MANAGE_SUBSCRIPTION' => [
        'TITLE' => 'Quản lý thuê bao của bạn',
        'DESCRIPTION' => 'Xem các hóa đơn trước đây của bạn, chỉnh sửa chi tiết thanh toán hoặc hủy thuê bao của bạn.',
        'BUTTON_TXT' => 'Đi tới cổng thanh toán',
    ],
    'CAPTAIN' => [
        'TITLE' => 'Captain',
        'DESCRIPTION' => 'Quản lý mức dùng và tín dụng của Captain AI.',
        'BUTTON_TXT' => 'Mua thêm tín dụng',
        'DOCUMENTS' => 'Tài liệu',
        'RESPONSES' => 'Responses',
        'UPGRADE' => 'Gói miễn phí không có Captain, hãy nâng cấp ngay để dùng trợ lý, copilot và nhiều thứ khác.',
        'REFRESH_CREDITS' => 'Làm mới',
    ],
    'CHAT_WITH_US' => [
        'TITLE' => 'Cần hỗ trợ?',
        'DESCRIPTION' => 'Bạn có gặp phải bất kỳ vấn đề nào trong thanh toán không? Hãy cho chúng tôi biết.',
        'BUTTON_TXT' => 'Trò chuyện với chúng tôi',
    ],
    'NO_BILLING_USER' => 'Tài khoản thanh toán của bạn đang được định cấu hình. Hãy làm mới trang và thử lại.',
    'TOPUP' => [
        'BUY_CREDITS' => 'Mua thêm tín dụng',
        'MODAL_TITLE' => 'Mua tín dụng AI',
        'MODAL_DESCRIPTION' => 'Mua thêm tín dụng cho Captain AI.',
        'CREDITS' => 'TÍN DỤNG',
        'ONE_TIME' => 'một lần',
        'POPULAR' => 'Phổ biến nhất',
        'NOTE_TITLE' => 'Ghi chú:',
        'NOTE_DESCRIPTION' => 'Tín dụng được cộng ngay và hết hạn sau 6 tháng. Bạn cần có gói đang hoạt động mới dùng được tín dụng. Tín dụng mua thêm được dùng sau khi hết tín dụng hằng tháng của gói.',
        'CANCEL' => 'Huỷ',
        'PURCHASE' => 'Mua tín dụng',
        'LOADING' => 'Đang tải các lựa chọn...',
        'FETCH_ERROR' => 'Không tải được các gói tín dụng. Bạn hãy thử lại.',
        'RETRY' => 'Thử lại',
        'PURCHASE_ERROR' => 'Không xử lý được giao dịch. Bạn hãy thử lại.',
        'PURCHASE_SUCCESS' => 'Đã cộng {credits} tín dụng vào tài khoản của bạn',
        'CONFIRM' => [
            'TITLE' => 'Xác nhận mua',
            'DESCRIPTION' => 'Bạn sắp mua {credits} tín dụng với giá {amount}.',
            'INSTANT_DEDUCTION_NOTE' => 'Thẻ đã lưu của bạn sẽ bị trừ tiền ngay khi xác nhận.',
            'GO_BACK' => 'Quay lại',
            'CONFIRM_PURCHASE' => 'Xác nhận mua',
        ],
    ],
];
