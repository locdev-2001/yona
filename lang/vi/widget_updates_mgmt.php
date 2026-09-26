<?php

// Trang cài đặt "Bài cập nhật trên widget" (dashboard/settings/widgetUpdates).
// Nhãn tag (khuyến mãi/hàng mới/thông báo) dùng chung WIDGET.UPDATES.TAG.* —
// không lặp lại chuỗi đã có cho tab Cập nhật của widget.

return [
    'HEADER' => 'Bài cập nhật trên widget',
    'HEADER_BTN_TXT' => 'Thêm bài cập nhật',
    'DESCRIPTION' => 'Đăng khuyến mãi, hàng mới hoặc thông báo lên tab Cập nhật của widget chat trên website.',
    'LOADING' => 'Đang tải bài cập nhật',
    'SEARCH_PLACEHOLDER' => 'Tìm bài cập nhật...',
    'NO_RESULTS' => 'Không tìm thấy bài nào khớp',
    'LIST' => [
        '404' => 'Chưa có bài cập nhật nào. Thêm bài đầu tiên để khách thấy ở tab Cập nhật.',
        'TABLE_HEADER' => [
            'COVER' => 'Ảnh bìa',
            'TITLE' => 'Tiêu đề',
            'TAG' => 'Nhãn',
            'INBOX' => 'Hộp thư',
            'STATUS' => 'Trạng thái',
            'ACTION' => 'Hành động',
        ],
        'ALL_INBOXES' => 'Mọi website',
        'STATUS_DRAFT' => 'Nháp',
        'STATUS_PUBLISHED' => 'Đã đăng',
    ],
    'FORM' => [
        'TITLE' => [
            'LABEL' => 'Tiêu đề',
            'PLACEHOLDER' => 'Giảm 15% bộ sưu tập men lam đến hết 30/09',
            'REQUIRED_ERROR' => 'Tiêu đề là bắt buộc',
            'MAX_ERROR' => 'Tiêu đề tối đa 120 ký tự',
        ],
        'BODY' => [
            'LABEL' => 'Nội dung',
            'PLACEHOLDER' => 'Mô tả chi tiết bài cập nhật. Xuống dòng sẽ giữ nguyên khi hiển thị trên widget.',
            'MAX_ERROR' => 'Nội dung tối đa 5000 ký tự',
        ],
        'TAG' => [
            'LABEL' => 'Nhãn',
        ],
        'COVER' => [
            'LABEL' => 'Ảnh bìa',
            'UPLOAD_BTN' => 'Tải ảnh lên',
            'REPLACE_BTN' => 'Đổi ảnh',
            'REMOVE_BTN' => 'Gỡ ảnh',
            'UPLOAD_ERROR' => 'Tải ảnh lên thất bại, thử lại nhé',
        ],
        'CTA_LABEL' => [
            'LABEL' => 'Chữ trên nút hành động',
            'PLACEHOLDER' => 'Xem bộ sưu tập',
            'REQUIRED_ERROR' => 'Cần có chữ trên nút khi đã nhập đường dẫn',
            'MAX_ERROR' => 'Tối đa 40 ký tự',
        ],
        'CTA_URL' => [
            'LABEL' => 'Đường dẫn khi bấm nút',
            'PLACEHOLDER' => 'https://...',
            'INVALID_ERROR' => 'Đường dẫn phải bắt đầu bằng http:// hoặc https://',
        ],
        'INBOX' => [
            'LABEL' => 'Hiện ở hộp thư',
            'PLACEHOLDER' => 'Mọi website',
        ],
        'PREVIEW_TITLE' => 'Xem trước trên widget',
        'SAVE_DRAFT' => 'Lưu nháp',
        'PUBLISH' => 'Đăng',
        'UNPUBLISH' => 'Gỡ đăng',
        'CANCEL' => 'Huỷ',
        'EDIT' => 'Sửa',
        'DELETE' => 'Xoá',
    ],
    'ADD' => [
        'TITLE' => 'Thêm bài cập nhật',
        'DESC' => 'Bài mới lưu ở dạng nháp cho tới khi bạn bấm Đăng.',
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã lưu bài cập nhật',
            'ERROR_MESSAGE' => 'Đã có lỗi, vui lòng thử lại',
        ],
    ],
    'EDIT' => [
        'TITLE' => 'Sửa bài cập nhật',
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã lưu thay đổi',
            'ERROR_MESSAGE' => 'Đã có lỗi, vui lòng thử lại',
        ],
    ],
    'PUBLISH' => [
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã đăng bài lên widget',
            'ERROR_MESSAGE' => 'Đăng bài thất bại, vui lòng thử lại',
        ],
    ],
    'UNPUBLISH' => [
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã gỡ bài khỏi widget',
            'ERROR_MESSAGE' => 'Gỡ bài thất bại, vui lòng thử lại',
        ],
    ],
    'DELETE' => [
        'CONFIRM' => [
            'TITLE' => 'Xác nhận xoá',
            'MESSAGE' => 'Bạn có chắc muốn xoá bài',
            'YES' => 'Có, xoá',
            'NO' => 'Không, giữ lại',
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã xoá bài cập nhật',
            'ERROR_MESSAGE' => 'Đã có lỗi, vui lòng thử lại',
        ],
    ],
];
