<?php

// Tiếng Việt — chuỗi giao diện cho Custom Fields engine (P02).
// Đồng bộ key với lang/en/custom_fields.php (G1 — KHÔNG có file ja).
return [
    'title' => 'Trường tùy chỉnh',
    'subtitle' => 'Thêm trường thông tin cho từng loại đối tượng.',

    'field_types' => [
        'input' => 'Văn bản ngắn',
        'number' => 'Số',
        'textarea' => 'Văn bản dài',
        'select' => 'Danh sách (chọn 1)',
        'multiselect' => 'Danh sách (chọn nhiều)',
        'checkbox' => 'Ô chọn',
        'date' => 'Ngày',
        'datetime' => 'Ngày giờ',
        'color' => 'Màu sắc',
        'link' => 'Liên kết',
    ],

    'entity_types' => [
        'client' => 'Khách hàng',
        'contact' => 'Liên hệ',
        'lead' => 'Khách hàng tiềm năng',
        'project' => 'Dự án',
        'task' => 'Công việc',
    ],

    'fields' => [
        'name' => 'Tên trường',
        'field_type' => 'Loại trường',
        'entity_type' => 'Loại đối tượng',
        'options' => 'Tùy chọn',
        'default_value' => 'Giá trị mặc định',
        'required' => 'Bắt buộc',
        'active' => 'Kích hoạt',
        'order' => 'Thứ tự',
        'bs_column' => 'Độ rộng (1-12)',
        'show_on_table' => 'Hiện trên bảng',
        'show_on_client_portal' => 'Hiện trên portal khách hàng',
        'disallow_client_edit' => 'Không cho khách hàng chỉnh sửa',
        'only_admin' => 'Chỉ admin thấy',
        'slug' => 'Mã định danh (slug)',
        'url' => 'Địa chỉ URL',
        'link_text' => 'Văn bản liên kết',
        'add_option' => 'Thêm tùy chọn',
    ],

    'flash' => [
        'created' => 'Đã tạo trường tùy chỉnh.',
        'updated' => 'Đã cập nhật trường tùy chỉnh.',
        'deleted' => 'Đã xóa trường tùy chỉnh.',
    ],

    'errors' => [
        'option_required' => 'Loại trường này yêu cầu ít nhất một tùy chọn.',
        'option_in_list' => 'Trường :name chứa giá trị không hợp lệ.',
        'option_in_use' => 'Không thể xóa tùy chọn ":option" vì đang được sử dụng.',
        'color_hex' => 'Trường :name phải là mã màu HEX hợp lệ (vd: #FF5733).',
        'link_url' => 'Trường :name phải có địa chỉ URL hợp lệ.',
        'number_invalid' => 'Trường :name phải là số.',
        'date_invalid' => 'Trường :name phải có định dạng YYYY-MM-DD.',
        'datetime_invalid' => 'Trường :name phải có định dạng YYYY-MM-DD HH:MM.',
        'required' => 'Trường :name là bắt buộc.',
        'immutable' => 'Không thể thay đổi loại trường hoặc loại đối tượng sau khi đã tạo.',
    ],

    'actions' => [
        'add' => 'Thêm trường',
        'edit' => 'Sửa trường',
        'delete' => 'Xóa trường',
        'save' => 'Lưu',
        'cancel' => 'Hủy',
        'add_option' => 'Thêm tùy chọn',
        'delete_confirm' => 'Xóa trường này? Hành động không thể hoàn tác.',
    ],

    'empty' => 'Chưa có trường tùy chỉnh nào.',
    'select_entity' => 'Chọn loại đối tượng',
    'immutable_hint' => 'Loại trường và loại đối tượng không thể thay đổi sau khi tạo.',
];
