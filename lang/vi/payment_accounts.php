<?php

// Cài đặt / Tài khoản / Chuyển khoản (resources/js/dashboard/settings/paymentAccounts).

return [
    'HEADER' => 'Chuyển khoản',
    'DESCRIPTION' => 'Tài khoản ngân hàng nhận tiền khi gửi thẻ chuyển khoản trong hội thoại. Khách chuyển thẳng vào tài khoản của bạn, Yona không giữ tiền.',
    'LOADING' => 'Đang tải tài khoản',
    'LIST' => [
        'TITLE' => 'Tài khoản nhận tiền',
        'EMPTY' => 'Chưa có tài khoản nhận tiền nào.',
        'ADD' => 'Thêm tài khoản',
        'DEFAULT_BADGE' => 'Mặc định',
    ],
    'FORM' => [
        'EDIT' => 'Sửa',
        'DELETE' => 'Xoá',
        'SAVE' => 'Lưu thay đổi',
        'CREATE' => 'Thêm tài khoản',
        'CANCEL' => 'Huỷ',
        'BANK' => [
            'LABEL' => 'Ngân hàng',
            'PLACEHOLDER' => 'Chọn ngân hàng',
            'SEARCH_PLACEHOLDER' => 'Tìm ngân hàng...',
            'EMPTY' => 'Không tìm thấy ngân hàng',
        ],
        'ACCOUNT_NUMBER' => [
            'LABEL' => 'Số tài khoản',
            'PLACEHOLDER' => 'Chỉ nhập số',
            'INVALID' => 'Số tài khoản chỉ gồm 4-30 chữ số.',
        ],
        'ACCOUNT_NAME' => [
            'LABEL' => 'Chủ tài khoản',
            'PLACEHOLDER' => 'HKD GOM MOC',
            'HINT' => 'Viết hoa không dấu, đúng như trên ngân hàng để khách kiểm tra.',
        ],
        'MEMO_TEMPLATE' => [
            'LABEL' => 'Nội dung chuyển khoản',
            'HINT' => 'Khách thấy nội dung này trong app ngân hàng (tối đa 25 ký tự, không dấu). Thêm {ma_hoi_thoai} nếu muốn kèm mã hội thoại để đối soát.',
        ],
        'IS_DEFAULT' => [
            'LABEL' => 'Đặt làm tài khoản mặc định',
        ],
        'ALLOW_ALL_AGENTS' => [
            'LABEL' => 'Cho mọi nhân viên gửi thẻ chuyển khoản trong hội thoại',
        ],
    ],
    'ADD' => [
        'TITLE' => 'Thêm tài khoản',
        'SUCCESS' => 'Đã thêm tài khoản',
        'ERROR' => 'Đã có lỗi, vui lòng thử lại',
    ],
    'EDIT' => [
        'TITLE' => 'Sửa tài khoản',
        'SUCCESS' => 'Đã lưu thay đổi',
        'ERROR' => 'Đã có lỗi, vui lòng thử lại',
    ],
    'DELETE' => [
        'SUCCESS' => 'Đã xoá tài khoản',
        'ERROR' => 'Đã có lỗi, vui lòng thử lại',
        'CONFIRM' => [
            'TITLE' => 'Xoá tài khoản?',
            'MESSAGE' => 'Nhân viên sẽ không gửi thẻ chuyển khoản bằng tài khoản này được nữa:',
            'YES' => 'Có, xoá',
            'NO' => 'Không, giữ lại',
        ],
    ],
    'PREVIEW' => [
        'TITLE' => 'Khách sẽ thấy',
        'EMPTY' => 'Lưu tài khoản để xem mã QR.',
        'QR_ALT' => 'Mã QR chuyển khoản',
        'BANK' => 'Ngân hàng',
        'ACCOUNT_NUMBER' => 'Số tài khoản',
        'NOTE' => 'Mã QR theo chuẩn VietQR, quét được bằng mọi ứng dụng ngân hàng.',
    ],
];
