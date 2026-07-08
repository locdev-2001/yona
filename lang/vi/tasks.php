<?php

// P09 — Tasks module strings (Vietnamese). Mirror in lang/en/tasks.php.
// G1 — repo only has vi + en, NO ja.
return [
    // Flash messages
    'created' => 'Tác vụ đã được tạo.',
    'updated' => 'Tác vụ đã được cập nhật.',
    'deleted' => 'Tác vụ đã được xóa.',
    'assigned' => 'Người phụ trách đã được cập nhật.',
    'status_updated' => 'Trạng thái đã được cập nhật.',

    // Timer flash
    'timer_started' => 'Đã bắt đầu tính giờ.',
    'timer_stopped' => 'Đã dừng tính giờ.',
    'timer_logged' => 'Đã ghi nhận thời gian.',
    'timer_updated' => 'Thời gian đã được cập nhật.',
    'timer_deleted' => 'Đã xóa mục thời gian.',

    // Page titles
    'title' => [
        'index' => 'Tác vụ',
        'kanban' => 'Bảng Kanban',
        'show' => 'Chi tiết tác vụ',
        'create' => 'Tạo tác vụ',
        'edit' => 'Chỉnh sửa tác vụ',
        'checklist' => 'Danh sách kiểm tra',
        'timers' => 'Thời gian làm việc',
    ],

    // Fields
    'fields' => [
        'name' => 'Tên tác vụ',
        'description' => 'Mô tả',
        'status' => 'Trạng thái',
        'priority' => 'Độ ưu tiên',
        'start_date' => 'Ngày bắt đầu',
        'due_date' => 'Hạn hoàn thành',
        'related_to' => 'Liên kết tới',
        'milestone' => 'Cột mốc',
        'assignees' => 'Người phụ trách',
        'followers' => 'Người theo dõi',
        'billable' => 'Tính phí',
        'hourly_rate' => 'Giá/giờ',
        'visible_to_customer' => 'Hiển thị với khách hàng',
        'task_number' => 'Số tác vụ',
        'note' => 'Ghi chú',
        'start_time' => 'Thời gian bắt đầu',
        'end_time' => 'Thời gian kết thúc',
        'duration' => 'Thời lượng',
    ],

    // Actions
    'actions' => [
        'create' => 'Tạo tác vụ',
        'edit' => 'Chỉnh sửa',
        'delete' => 'Xóa',
        'assign' => 'Gán người phụ trách',
        'change_status' => 'Đổi trạng thái',
        'start_timer' => 'Bắt đầu tính giờ',
        'stop_timer' => 'Dừng tính giờ',
        'log_time' => 'Ghi nhận thời gian',
        'search' => 'Tìm kiếm...',
        'add_checklist' => 'Thêm mục kiểm tra',
        'toggle_done' => 'Đánh dấu hoàn thành',
    ],

    // Status labels
    'status' => [
        'not_started' => 'Chưa bắt đầu',
        'awaiting_feedback' => 'Chờ phản hồi',
        'testing' => 'Đang kiểm thử',
        'in_progress' => 'Đang thực hiện',
        'complete' => 'Hoàn thành',
    ],

    // Priority labels
    'priority' => [
        'low' => 'Thấp',
        'medium' => 'Trung bình',
        'high' => 'Cao',
        'urgent' => 'Khẩn cấp',
    ],

    // Filters
    'filters' => [
        'all_statuses' => 'Tất cả trạng thái',
        'all_priorities' => 'Tất cả độ ưu tiên',
        'all_assignees' => 'Tất cả người phụ trách',
        'my_tasks' => 'Tác vụ của tôi',
    ],

    // Kanban
    'kanban' => [
        'title' => 'Bảng Kanban',
        'drag_hint' => 'Kéo thả để thay đổi trạng thái',
        'empty_column' => 'Không có tác vụ nào',
    ],

    // Checklist
    'checklist' => [
        'title' => 'Danh sách kiểm tra',
        'added' => 'Đã thêm mục kiểm tra.',
        'deleted' => 'Đã xóa mục kiểm tra.',
        'empty' => 'Chưa có mục kiểm tra nào.',
        'placeholder' => 'Nhập mục kiểm tra...',
    ],

    // Timesheet / Timer
    'timer' => [
        'title' => 'Thời gian làm việc',
        'running' => 'Đang chạy',
        'stopped' => 'Đã dừng',
        'billed_locked' => 'Tác vụ đã được thanh toán — không thể thay đổi thời gian.',
        'manual_entry' => 'Nhập thủ công',
        'total' => 'Tổng thời gian',
        'empty' => 'Chưa có mục thời gian nào.',
    ],

    // Related-to types
    'related_type' => [
        'lead' => 'Tiềm năng',
        'client' => 'Khách hàng',
        'project' => 'Dự án',
        'contact' => 'Liên hệ',
        'standalone' => 'Độc lập',
    ],

    // Notifications
    'notifications' => [
        'assigned' => 'Bạn được giao tác vụ: :task_name',
    ],
];
