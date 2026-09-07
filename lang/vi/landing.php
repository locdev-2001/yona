<?php

// Trang chủ công khai (`/`) — chuyển từ nhánh `main` (lang/vi/platform.php khối
// `landing`). Trang này KHÔNG thuộc Chatwoot gốc: Chatwoot đưa thẳng khách vào
// màn đăng nhập, Yona giữ trang giới thiệu sản phẩm ở gốc tên miền.
return [
    'nav' => [
        'features' => 'Tính năng',
        'login' => 'Đăng nhập',
        'register' => 'Dùng thử',
        'dashboard' => 'Vào Dashboard',
        'back_to_home' => 'Về trang chủ',
    ],
    'hero' => [
        'eyebrow' => 'Conversational CRM & Automation',
        'title' => 'Biến hội thoại thành khách hàng',
        'subtitle' => 'Gom tin nhắn khách từ mọi kênh chat về một inbox — không sót khách, tự động chăm sóc, chốt đơn nhanh hơn.',
        'cta_primary' => 'Bắt đầu miễn phí',
        'cta_secondary' => 'Đăng nhập',
        'cta_dashboard' => 'Vào Dashboard',
        'hint' => 'Không cần thẻ tín dụng · Hủy bất cứ lúc nào',
    ],
    'features' => [
        'title' => 'Từ hội thoại đến chốt đơn',
        'subtitle' => 'Inbox đa kênh, CRM pipeline và tự động hóa chăm sóc trong một nền tảng — cả đội cùng nhịp, realtime.',
        'inbox' => [
            'title' => 'Inbox đa kênh',
            'description' => 'Gom tin nhắn khách từ mọi kênh chat về một nơi — trả lời nhanh, không sót hội thoại nào.',
        ],
        'crm' => [
            'title' => 'Hội thoại thành khách hàng',
            'description' => 'Một chạm biến hội thoại thành Lead, theo dõi qua pipeline kéo-thả tới khi chốt đơn.',
        ],
        'automation' => [
            'title' => 'Tự động hóa chăm sóc',
            'description' => 'Workflow tự nhắn tin, tạo việc, gắn nhãn theo kịch bản — khách nào cũng được chăm đúng lúc.',
        ],
        'teams' => [
            'title' => 'Đội nhóm & phân quyền',
            'description' => 'Đa không gian làm việc, phân quyền tới từng bản ghi, cập nhật realtime cho cả đội.',
        ],
    ],
    'footer' => [
        'tagline' => 'Conversational CRM & Automation cho SME Việt.',
        'copyright' => '© :year Yona. Đã đăng ký bản quyền.',
    ],
    'appearance' => [
        'label' => 'Giao diện',
        'light' => 'Sáng',
        'dark' => 'Tối',
        'auto' => 'Theo hệ thống',
    ],
];
