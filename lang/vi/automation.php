<?php

// P260704 — Automation/Workflow Engine strings (Vietnamese). Mirror in lang/en/automation.php.
return [
    'created' => 'Workflow đã được tạo.',
    'updated' => 'Workflow đã được cập nhật.',
    'deleted' => 'Workflow đã được xóa.',
    'enrolled' => 'Đã chạy workflow.',

    'title' => [
        'index' => 'Automation',
        'create' => 'Tạo workflow',
        'show' => 'Chỉnh sửa workflow',
    ],

    'index' => [
        'create_button' => 'Tạo workflow',
        'empty' => 'Chưa có workflow nào.',
        'column_name' => 'Tên',
        'column_status' => 'Trạng thái',
        'column_updated' => 'Cập nhật lần cuối',
        'status_active' => 'Đang bật',
        'status_inactive' => 'Đang tắt',
    ],

    'canvas' => [
        'name_placeholder' => 'Tên workflow',
        'save' => 'Lưu',
        'saving' => 'Đang lưu...',
        'delete' => 'Xóa workflow',
        'delete_confirm' => 'Xóa workflow này? Không thể hoàn tác.',
        'run_manually' => 'Chạy thủ công',
        'active_toggle' => 'Kích hoạt',
        'palette_title' => 'Thêm node',
        'inspector_title' => 'Cấu hình node',
        'inspector_empty' => 'Chọn 1 node trên canvas để cấu hình.',
        'delete_node' => 'Xóa node',
        'validation_no_start' => 'Graph phải có đúng 1 node bắt đầu.',
        'validation_dangling_edge' => 'Có kết nối trỏ tới node không tồn tại.',
        'validation_start_incoming' => 'Node bắt đầu không được có kết nối đi vào.',
        'branch_true' => 'Đúng',
        'branch_false' => 'Sai',
        'condition_count' => ':count điều kiện',
        'recipient_count' => ':count người nhận',
        'stage_selected' => 'Đã chọn giai đoạn',
    ],

    'node_types' => [
        'start' => 'Bắt đầu',
        'condition' => 'Điều kiện',
        'wait' => 'Chờ',
        'end' => 'Kết thúc',
        'send_message' => 'Gửi tin nhắn',
        'create_task' => 'Tạo tác vụ',
        'notify_internal' => 'Thông báo nội bộ',
        'tag' => 'Gắn/Gỡ tag',
        'change_lead_stage' => 'Đổi giai đoạn Lead',
    ],

    'triggers' => [
        'lead_created' => 'Khi Lead được tạo',
        'lead_assigned' => 'Khi Lead được gán',
        'lead_stage_changed' => 'Khi Lead đổi giai đoạn',
        'message_received' => 'Khi có tin nhắn đến',
        'manual' => 'Chạy thủ công',
    ],

    'fields' => [
        'trigger' => 'Sự kiện kích hoạt',
        'condition_field' => 'Trường',
        'condition_operator' => 'Toán tử',
        'condition_value' => 'Giá trị',
        'add_condition' => 'Thêm điều kiện',
        'remove_condition' => 'Xóa',
        'wait_amount' => 'Số lượng',
        'wait_unit' => 'Đơn vị',
        'wait_minutes' => 'Phút',
        'wait_hours' => 'Giờ',
        'wait_days' => 'Ngày',
        'channel' => 'Kênh',
        'message_body' => 'Nội dung tin nhắn',
        'task_name' => 'Tên tác vụ',
        'task_description' => 'Mô tả',
        'task_priority' => 'Độ ưu tiên',
        'task_due_in_days' => 'Hạn sau (ngày)',
        'notify_recipients' => 'Người nhận',
        'notify_message' => 'Nội dung thông báo',
        'tag_action' => 'Hành động',
        'tag_attach' => 'Gắn',
        'tag_detach' => 'Gỡ',
        'tag_name' => 'Tên tag',
        'tag_color' => 'Màu',
        'pipeline_stage' => 'Giai đoạn',
    ],

    'operators' => [
        'equals' => 'Bằng',
        'not_equals' => 'Khác',
        'contains' => 'Chứa',
        'greater_than' => 'Lớn hơn',
        'less_than' => 'Nhỏ hơn',
    ],

    'priorities' => [
        'low' => 'Thấp',
        'medium' => 'Trung bình',
        'high' => 'Cao',
        'urgent' => 'Khẩn cấp',
    ],

    'enroll' => [
        'title' => 'Chạy thủ công',
        'subject_type' => 'Loại đối tượng',
        'subject_id' => 'ID đối tượng',
        'submit' => 'Chạy',
    ],
];
