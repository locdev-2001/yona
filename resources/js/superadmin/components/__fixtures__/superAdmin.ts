import type { SuperAdminPageProps } from '../../types';

// Props chia sẻ tối thiểu của console cho test (khớp SuperAdminInertia).
export function superAdminProps(overrides: Partial<SuperAdminPageProps['superAdmin']> = {}): SuperAdminPageProps['superAdmin'] {
    return {
        installationName: 'Yona',
        logo: '/logo.svg',
        logoThumbnail: '/logo-thumb.svg',
        version: '1.0',
        navigation: [],
        toolPages: [{ key: 'sticker_packs', label: 'Kho sticker', url: '/admin/sticker_packs' }],
        settingsPages: [],
        currentPath: '/admin',
        currentUrl: '/admin',
        searchUrl: '/admin/api/search',
        currentUser: { name: 'Lộc Admin', email: 'loc@yona.vn' },
        labels: {
            navigation: 'Điều hướng',
            open_menu: 'Mở menu',
            search: 'Tìm kiếm',
            command_title: 'Bảng lệnh',
            command_placeholder: 'Nhập tên trang…',
            command_navigation: 'Trang',
            command_results: 'Kết quả tìm kiếm',
            command_loading: 'Đang tìm…',
            command_error: 'Không tìm được lúc này.',
            command_empty: 'Không có kết quả cho “{query}”.',
            result_account: 'Tài khoản',
            result_user: 'Người dùng',
            user_menu: 'Tài khoản quản trị',
            logout: 'Đăng xuất',
            records_total: '{total} bản ghi',
            search_records: 'Tìm trong {resource}…',
            clear_search: 'Xoá tìm kiếm',
            filter: 'Bộ lọc',
            filter_all: 'Tất cả',
            new_record: 'Thêm mới',
            no_records: 'Chưa có bản ghi nào',
            edit: 'Sửa',
            delete: 'Xoá',
            cancel: 'Huỷ',
            delete_confirm_title: 'Xoá bản ghi này?',
            no_suspension_history: 'Chưa có lịch sử tạm khoá nào.',
            show_secret: 'Hiện',
            impersonate: 'Đăng nhập hộ',
            impersonate_confirm: 'Xác nhận và đăng nhập hộ',
            login_password: 'Mật khẩu',
            opens_new_tab: 'mở tab mới',
        },
        dictionary: {
            attributes: { name: 'Tên', created_at: 'Tạo lúc' },
            filters: { active: 'Đang hoạt động', suspended: 'Tạm khoá' },
        },
        navGroups: [
            { key: 'overview', label: 'Tổng quan', items: [{ key: 'dashboard', label: 'Bảng điều khiển', url: '/admin', exact: true }] },
            {
                key: 'customers',
                label: 'Khách hàng',
                items: [
                    { key: 'accounts', label: 'Tài khoản', url: '/admin/accounts' },
                    { key: 'users', label: 'Người dùng', url: '/admin/users' },
                ],
            },
            {
                key: 'channels',
                label: 'Kênh & hệ thống',
                items: [{ key: 'channel_health', label: 'Sức khoẻ kênh', url: '/admin/channel_health' }],
            },
            {
                key: 'config',
                label: 'Cấu hình',
                items: [
                    {
                        key: 'app_config',
                        label: 'Cấu hình ứng dụng',
                        url: '/admin/app_config',
                        children: [
                            { key: 'general', label: 'General', url: '/admin/app_config?config=general' },
                            { key: 'email', label: 'Email', url: '/admin/app_config?config=email' },
                        ],
                    },
                ],
            },
            {
                key: 'tools',
                label: 'Công cụ',
                items: [{ key: 'horizon', label: 'Hàng đợi (Horizon)', url: '/horizon', external: true }],
            },
        ],
        ...overrides,
    };
}
