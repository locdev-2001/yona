<?php

// P07 — Leads module strings (Vietnamese). Mirror in lang/en/leads.php.
// G1 — repo only has vi + en, NO ja.
return [
    // Page titles
    'title' => [
        'index' => 'Danh sách lead',
        'kanban' => 'Bảng Kanban',
        'create' => 'Thêm lead',
        'edit' => 'Chỉnh sửa lead',
        'show' => 'Chi tiết lead',
        'convert' => 'Chuyển đổi lead',
    ],

    // Fields
    'fields' => [
        'name' => 'Tên',
        'title' => 'Chức danh',
        'email' => 'Email',
        'phone' => 'Điện thoại',
        'company' => 'Công ty',
        'lead_value' => 'Giá trị',
        'website' => 'Website',
        'description' => 'Mô tả',
        'pipeline' => 'Pipeline',
        'stage' => 'Giai đoạn',
        'source' => 'Nguồn',
        'assigned_to' => 'Người phụ trách',
        'owner' => 'Chủ sở hữu',
        'last_contact' => 'Liên hệ gần nhất',
        'date_converted' => 'Ngày chuyển đổi',
        'is_public' => 'Công khai',
        'is_lost' => 'Đã mất',
        'is_junk' => 'Rác',
        'lead_number' => 'Mã lead',
        'custom_fields' => 'Trường tùy chỉnh',
    ],

    // Address
    'address' => [
        'label' => 'Địa chỉ',
        'street' => 'Địa chỉ',
        'city' => 'Thành phố',
        'state' => 'Tỉnh/Bang',
        'zip' => 'Mã bưu chính',
        'country' => 'Quốc gia',
    ],

    // Actions
    'actions' => [
        'create' => 'Thêm lead',
        'edit' => 'Chỉnh sửa',
        'delete' => 'Xóa',
        'assign' => 'Phân công',
        'convert' => 'Chuyển đổi',
        'mark_lost' => 'Đánh dấu mất',
        'mark_junk' => 'Đánh dấu rác',
        'restore' => 'Khôi phục',
        'move_stage' => 'Chuyển giai đoạn',
        'view_kanban' => 'Xem Kanban',
        'view_list' => 'Xem danh sách',
    ],

    // Flash messages
    'flash' => [
        'created' => 'Lead đã được tạo thành công.',
        'updated' => 'Lead đã được cập nhật.',
        'deleted' => 'Lead đã được xóa.',
        'assigned' => 'Lead đã được phân công.',
        'converted' => 'Lead đã được chuyển đổi thành khách hàng.',
        'marked_lost' => 'Lead đã được đánh dấu là mất.',
        'marked_junk' => 'Lead đã được đánh dấu là rác.',
        'restored' => 'Lead đã được khôi phục.',
        'stage_moved' => 'Lead đã được chuyển giai đoạn.',
    ],

    // Activity keys (rendered via ActivityFormatter)
    'activity' => [
        'lead.created' => ':actor đã tạo lead',
        'lead.updated' => ':actor đã cập nhật lead',
        'lead.stage_changed' => ':actor đã chuyển lead sang giai đoạn mới',
        'lead.assigned' => ':actor đã phân công lead',
        'lead.converted' => ':actor đã chuyển đổi lead thành khách hàng',
        'lead.marked_lost' => ':actor đã đánh dấu lead là mất',
        'lead.marked_junk' => ':actor đã đánh dấu lead là rác',
        'lead.restored' => ':actor đã khôi phục lead',
    ],

    // Notification strings (lead_assigned template)
    'notification' => [
        'assigned' => [
            'subject' => 'Lead mới được phân công cho bạn',
            'line' => 'Lead ":lead_name" đã được phân công cho bạn bởi :assigned_by.',
            'action' => 'Xem lead',
        ],
    ],

    // Errors
    'errors' => [
        'already_converted' => 'Lead này đã được chuyển đổi trước đó.',
        'client_not_in_workspace' => 'Khách hàng được chọn không thuộc workspace này.',
        'client_workspace_mismatch' => 'Không thể chuyển đổi: workspace khách hàng không khớp.',
    ],

    // Validation
    'validation' => [
        'stage_not_in_pipeline' => 'Giai đoạn không thuộc pipeline của lead này.',
    ],

    // Convert dialog
    'convert' => [
        'title' => 'Chuyển đổi lead thành khách hàng',
        'description' => 'Tạo hồ sơ khách hàng và người liên hệ từ lead này.',
        'create_new_client' => 'Tạo khách hàng mới',
        'client_name' => 'Tên công ty',
        'contact_name' => 'Tên người liên hệ',
        'submit' => 'Chuyển đổi',
    ],

    // Kanban
    'kanban' => [
        'no_pipeline' => 'Chưa có pipeline nào.',
        'empty_stage' => 'Chưa có lead nào.',
        'total_value' => 'Tổng giá trị',
    ],

    // Status badges
    'status' => [
        'active' => 'Đang hoạt động',
        'lost' => 'Đã mất',
        'junk' => 'Rác',
        'converted' => 'Đã chuyển đổi',
    ],
];
