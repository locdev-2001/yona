<?php

// Vietnamese. G1 — repository only has vi + en, never ja.
// Mirror keys in lang/en/email_templates.php (keep in sync).
return [
    'title' => 'Mẫu email',
    'subtitle' => 'Quản lý các mẫu email gửi tự động trong workspace.',

    'columns' => [
        'name' => 'Tên',
        'slug' => 'Slug',
        'type' => 'Nhóm',
        'language' => 'Ngôn ngữ',
        'subject' => 'Tiêu đề',
        'active' => 'Trạng thái',
    ],

    'form' => [
        'name' => 'Tên mẫu',
        'subject' => 'Tiêu đề email',
        'body' => 'Nội dung (HTML)',
        'plaintext' => 'Chỉ văn bản thuần',
        'active' => 'Kích hoạt',
        'sort_order' => 'Thứ tự',
        'test_email' => 'Gửi thử tới email',
    ],

    'actions' => [
        'edit' => 'Chỉnh sửa',
        'save' => 'Lưu thay đổi',
        'test_send' => 'Gửi thử',
        'preview' => 'Xem trước',
        'toggle' => 'Bật/tắt',
    ],

    'statuses' => [
        'active' => 'Đang kích hoạt',
        'inactive' => 'Đã tắt',
    ],

    'types' => [
        'leads' => 'Leads',
        'clients' => 'Khách hàng',
        'contacts' => 'Liên hệ',
        'projects' => 'Dự án',
        'tasks' => 'Công việc',
        'staff' => 'Nhân viên',
    ],

    'merge_fields' => [
        'title' => 'Merge fields có sẵn',
        'description' => 'Click để chèn token vào vị trí con trỏ.',
        'global' => [
            'company_name' => 'Tên workspace',
            'current_date' => 'Ngày hiện tại',
        ],
    ],

    'preview' => [
        'title' => 'Xem trước',
        'notice' => 'Xem trước được render với dữ liệu mẫu.',
    ],

    // Flash messages
    'updated' => 'Mẫu email đã được cập nhật.',
    'test_sent' => 'Email thử đã được gửi vào hàng đợi.',
];
