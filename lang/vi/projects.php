<?php

// P08 — Projects module strings (Vietnamese). Mirror in lang/en/projects.php.
// G1 — repo only has vi + en, NO ja.
return [
    // Page titles
    'title' => [
        'index' => 'Dự án',
        'create' => 'Tạo dự án',
        'edit' => 'Chỉnh sửa dự án',
        'show' => 'Chi tiết dự án',
        'members' => 'Thành viên dự án',
        'milestones' => 'Cột mốc dự án',
        'files' => 'Tệp đính kèm',
        'discussions' => 'Thảo luận',
        'activity' => 'Hoạt động',
    ],

    // Fields
    'fields' => [
        'name' => 'Tên dự án',
        'description' => 'Mô tả',
        'client' => 'Khách hàng',
        'status' => 'Trạng thái',
        'owner' => 'Người phụ trách',
        'team' => 'Nhóm',
        'billing_type' => 'Loại thanh toán',
        'start_date' => 'Ngày bắt đầu',
        'deadline' => 'Hạn chót',
        'progress' => 'Tiến độ',
        'progress_from_tasks' => 'Tính tiến độ từ công việc',
        'visible_to_customer' => 'Hiển thị với khách hàng',
        'is_pinned' => 'Ghim',
        'project_number' => 'Mã dự án',
        'finished_at' => 'Hoàn thành lúc',
    ],

    // Billing types (M3 placeholder labels)
    'billing_types' => [
        'fixed' => 'Giá cố định',
        'hourly' => 'Tính theo giờ',
        'non_billable' => 'Không tính phí',
    ],

    // Milestone fields
    'milestone' => [
        'name' => 'Tên cột mốc',
        'color' => 'Màu sắc',
        'due_date' => 'Ngày đến hạn',
        'description' => 'Mô tả',
        'order' => 'Thứ tự',
    ],

    // Discussion / reply fields
    'discussion' => [
        'subject' => 'Tiêu đề',
        'body' => 'Nội dung',
        'show_to_customer' => 'Hiển thị với khách hàng',
        'reply' => 'Trả lời',
        'replies' => 'Phản hồi',
    ],

    // Member fields
    'member' => [
        'user' => 'Thành viên',
        'added_at' => 'Ngày thêm',
    ],

    // Actions
    'actions' => [
        'create' => 'Tạo dự án',
        'edit' => 'Chỉnh sửa',
        'delete' => 'Xóa',
        'add_member' => 'Thêm thành viên',
        'remove_member' => 'Xóa thành viên',
        'add_milestone' => 'Thêm cột mốc',
        'upload_file' => 'Tải tệp lên',
        'new_discussion' => 'Thảo luận mới',
        'reply' => 'Trả lời',
        'change_status' => 'Đổi trạng thái',
        'pin' => 'Ghim',
        'unpin' => 'Bỏ ghim',
        'recalc_progress' => 'Tính lại tiến độ',
        'search' => 'Tìm kiếm...',
    ],

    // Success / info messages
    'messages' => [
        'created' => 'Dự án đã được tạo thành công.',
        'updated' => 'Dự án đã được cập nhật.',
        'deleted' => 'Dự án đã bị xóa.',
        'status_changed' => 'Trạng thái dự án đã được thay đổi.',
        'progress_updated' => 'Tiến độ đã được cập nhật.',
        'progress_recalculated' => 'Tiến độ đã được tính lại từ công việc.',
        'member_added' => 'Thành viên đã được thêm vào dự án.',
        'member_removed' => 'Thành viên đã bị xóa khỏi dự án.',
        'milestone_created' => 'Cột mốc đã được tạo.',
        'milestone_updated' => 'Cột mốc đã được cập nhật.',
        'milestone_deleted' => 'Cột mốc đã bị xóa.',
        'file_uploaded' => 'Tệp đã được tải lên.',
        'file_deleted' => 'Tệp đã bị xóa.',
        'discussion_opened' => 'Thảo luận đã được mở.',
        'discussion_deleted' => 'Thảo luận đã bị xóa.',
        'reply_added' => 'Phản hồi đã được thêm.',
    ],

    // Validation messages
    'validation' => [
        'member_not_active_workspace_member' => 'Người dùng này không phải thành viên đang hoạt động trong không gian làm việc.',
    ],

    // Activity action keys (for ActivityFormatter / i18n rendering)
    'activity' => [
        'project_created' => 'Dự án đã được tạo',
        'project_status_changed' => 'Trạng thái đã được thay đổi sang :to_status_name',
        'project_member_added' => 'Thành viên #:user_id đã được thêm vào dự án',
        'project_member_removed' => 'Thành viên #:user_id đã bị xóa khỏi dự án',
        'project_milestone_added' => 'Cột mốc ":milestone_name" đã được thêm',
        'project_file_uploaded' => 'Tệp đã được tải lên',
        'project_discussion_opened' => 'Thảo luận ":subject" đã được mở',
        'project_progress_updated' => 'Tiến độ đã được cập nhật thành :progress%',
    ],

    // Filters
    'filters' => [
        'all_statuses' => 'Tất cả trạng thái',
        'pinned_only' => 'Chỉ hiện đã ghim',
    ],

    // Tabs
    'tabs' => [
        'overview' => 'Tổng quan',
        'members' => 'Thành viên',
        'milestones' => 'Cột mốc',
        'files' => 'Tệp',
        'discussions' => 'Thảo luận',
        'activity' => 'Hoạt động',
    ],

    // Default statuses (seed labels - display only)
    'default_statuses' => [
        'open' => 'Đang mở',
        'in_progress' => 'Đang thực hiện',
        'on_hold' => 'Tạm dừng',
        'finished' => 'Hoàn thành',
        'closed' => 'Đã đóng',
    ],
];
