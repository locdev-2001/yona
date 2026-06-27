<?php

// P06 — Clients module strings (Vietnamese). Mirror in lang/en/clients.php.
// G1 — repo only has vi + en, NO ja.
return [
    // Page titles
    'title' => [
        'index' => 'Danh sách khách hàng',
        'create' => 'Thêm khách hàng',
        'edit' => 'Chỉnh sửa khách hàng',
        'show' => 'Chi tiết khách hàng',
        'groups' => 'Nhóm khách hàng',
    ],

    // Empty states
    'empty' => 'Chưa có khách hàng.',

    // Fields — client
    'fields' => [
        'name' => 'Tên công ty',
        'vat' => 'Mã số thuế',
        'phone' => 'Điện thoại',
        'website' => 'Website',
        'currency' => 'Tiền tệ',
        'default_language' => 'Ngôn ngữ mặc định',
        'owner' => 'Người phụ trách',
        'groups' => 'Nhóm',
        'leadid' => 'Nguồn lead',
    ],

    // Address
    'address' => [
        'billing' => 'Địa chỉ thanh toán',
        'shipping' => 'Địa chỉ giao hàng',
        'street' => 'Địa chỉ',
        'city' => 'Thành phố',
        'state' => 'Tỉnh/Bang',
        'zip' => 'Mã bưu chính',
        'country' => 'Quốc gia',
        'copy_from_billing' => 'Sao chép từ địa chỉ thanh toán',
    ],

    // Contact fields
    'contact' => [
        'title' => 'Người liên hệ',
        'dialog_description' => 'Thông tin người liên hệ của khách hàng.',
        'first_name' => 'Tên',
        'last_name' => 'Họ',
        'email' => 'Email',
        'phone' => 'Điện thoại',
        'job_title' => 'Chức danh',
        'language' => 'Ngôn ngữ',
        'is_primary' => 'Liên hệ chính',
        'set_primary' => 'Đặt làm liên hệ chính',
        'add' => 'Thêm người liên hệ',
        'edit' => 'Chỉnh sửa người liên hệ',
        'none' => 'Chưa có người liên hệ',
        'delete_confirm' => 'Xóa người liên hệ này?',
    ],

    // Groups
    'group' => [
        'title' => 'Nhóm',
        'dialog_description' => 'Phân loại khách hàng theo nhóm.',
        'add' => 'Thêm nhóm',
        'edit' => 'Chỉnh sửa nhóm',
        'name' => 'Tên nhóm',
        'slug' => 'Slug',
        'client_count' => ':count khách hàng',
        'empty' => 'Chưa có nhóm.',
        'delete_confirm' => 'Xóa nhóm này?',
    ],

    // Customer admins
    'customer_admin' => [
        'title' => 'Người quản lý khách hàng',
        'add' => 'Thêm người quản lý',
        'none' => 'Chưa có người quản lý',
        'save' => 'Lưu',
    ],

    // Vault
    'vault' => [
        'title' => 'Thông tin bảo mật',
        'dialog_description' => 'Lưu trữ thông tin đăng nhập, bảo mật của khách hàng.',
        'add' => 'Thêm thông tin',
        'edit' => 'Sửa thông tin',
        'empty' => 'Chưa có thông tin bảo mật',
        'delete_confirm' => 'Xóa thông tin bảo mật này?',
        'name' => 'Tên',
        'server_address' => 'Địa chỉ máy chủ',
        'port' => 'Cổng',
        'username' => 'Tên đăng nhập',
        'password' => 'Mật khẩu',
        'description' => 'Mô tả',
        'share_in_projects' => 'Chia sẻ trong dự án',
        'visibility' => 'Hiển thị',
        'visibility_private' => 'Riêng tư',
        'visibility_shared' => 'Chia sẻ',
    ],

    // Tabs (show page)
    'tabs' => [
        'profile' => 'Thông tin',
        'contacts' => 'Người liên hệ',
        'files' => 'Tệp đính kèm',
        'notes' => 'Ghi chú',
        'activity' => 'Hoạt động',
        'vault' => 'Bảo mật',
    ],

    // Actions
    'actions' => [
        'create' => 'Thêm khách hàng',
        'edit' => 'Chỉnh sửa',
        'delete' => 'Xóa',
        'delete_confirm' => 'Xóa khách hàng này?',
        'save' => 'Lưu',
        'cancel' => 'Hủy',
        'search' => 'Tìm kiếm',
        'filter_by_group' => 'Lọc theo nhóm',
        'all_groups' => 'Tất cả nhóm',
    ],

    // Flash messages
    'flash' => [
        'created' => 'Đã tạo khách hàng thành công.',
        'updated' => 'Đã cập nhật khách hàng.',
        'deleted' => 'Đã xóa khách hàng.',
        'contact_added' => 'Đã thêm người liên hệ.',
        'contact_updated' => 'Đã cập nhật người liên hệ.',
        'contact_deleted' => 'Đã xóa người liên hệ.',
        'primary_changed' => 'Đã đặt liên hệ chính.',
        'group_created' => 'Đã tạo nhóm.',
        'group_updated' => 'Đã cập nhật nhóm.',
        'group_deleted' => 'Đã xóa nhóm.',
        'admins_updated' => 'Đã cập nhật người quản lý.',
        'vault_created' => 'Đã thêm thông tin bảo mật.',
        'vault_updated' => 'Đã cập nhật thông tin bảo mật.',
        'vault_deleted' => 'Đã xóa thông tin bảo mật.',
    ],

    // Errors
    'errors' => [
        'customer_admin_not_member' => 'Người dùng không phải thành viên hoạt động của workspace này.',
    ],
];
