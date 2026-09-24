<?php

// Bản dịch tiếng Việt của lang/en/integration_apps.php.

return [
    'FETCHING' => 'Đang lấy Tích hợp',
    'NO_HOOK_CONFIGURED' => 'Không có tích hợp {integrationId} được cấu hình đối với tài khoản này.',
    'HEADER' => 'Ứng dụng',
    'COUNT' => '{n} kết nối | {n} kết nối',
    'SEARCH_PLACEHOLDER' => 'Tìm kiếm...',
    'NO_RESULTS' => 'Không tìm thấy kết quả nào khớp',
    'STATUS' => [
        'ENABLED' => 'Bật',
        'DISABLED' => 'Không bật',
    ],
    'CONFIGURE' => 'Cấu hình',
    'ADD_BUTTON' => 'Thêm một hook mới',
    'DELETE' => [
        'TITLE' => [
            'INBOX' => 'Xác nhận xoá',
            'ACCOUNT' => 'Ngắt kết nối',
        ],
        'MESSAGE' => [
            'INBOX' => 'Bạn có chắc muốn xoá?',
            'ACCOUNT' => 'Bạn có chắc muốn ngắt kết nối?',
        ],
        'CONFIRM_BUTTON_TEXT' => [
            'INBOX' => 'Có, Xoá',
            'ACCOUNT' => 'Có, ngắt kết nối',
        ],
        'CANCEL_BUTTON_TEXT' => 'Huỷ',
        'API' => [
            'SUCCESS_MESSAGE' => 'Hook đã được xoá thành công',
            'ERROR_MESSAGE' => 'Không kết nối được máy chủ. Bạn hãy thử lại sau.',
        ],
    ],
    'LIST' => [
        'FETCHING' => 'Đang lấy hook tích hợp',
        'INBOX' => 'Hộp thư',
        'ACTIONS' => 'Hành động',
        'DELETE' => [
            'BUTTON_TEXT' => 'Xoá',
        ],
    ],
    'ADD' => [
        'FORM' => [
            'INBOX' => [
                'LABEL' => 'Chọn hộp thư',
                'PLACEHOLDER' => 'Chọn hộp thư',
            ],
            'SUBMIT' => 'Tạo',
            'VALIDATING_OPENAI' => 'Đang xác thực với OpenAI...',
            'CANCEL' => 'Huỷ',
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Hook tích hợp đã được thêm thành công',
            'ERROR_MESSAGE' => 'Không kết nối được máy chủ. Bạn hãy thử lại sau.',
        ],
    ],
    'CONNECT' => [
        'BUTTON_TEXT' => 'Kết nối',
    ],
    'DISCONNECT' => [
        'BUTTON_TEXT' => 'Ngắt kết nối',
    ],
    'SIDEBAR_DESCRIPTION' => [
        'DIALOGFLOW' => 'Dialogflow là nền tảng xử lý ngôn ngữ tự nhiên để xây giao diện hội thoại. Nối Dialogflow với {installationName} để bot trả lời trước rồi chuyển cho nhân viên khi cần. Cách này giúp sàng lọc khách tiềm năng và giảm tải cho nhân viên nhờ tự trả lời câu hỏi thường gặp. Để thêm Dialogflow, hãy tạo Service Account trong Google Console rồi cung cấp thông tin xác thực. Xem tài liệu để biết chi tiết',
    ],
    'dashboard_apps' => [
        'name' => 'Ứng dụng bảng điều khiển',
        'description' => 'Dashboard Apps cho phép bạn tạo và nhúng ứng dụng hiển thị thông tin người dùng, đơn hàng hay lịch sử thanh toán, giúp nhân viên hỗ trợ nắm rõ bối cảnh hơn.',
    ],
    'dyte' => [
        'name' => 'Dyte',
        'short_description' => 'Gọi video/thoại với khách hàng ngay trong {installationName}.',
        'description' => 'Cloudflare RealtimeKit cho phép nhân viên gọi video/thoại với khách hàng ngay trong {installationName}.',
        'meeting_name' => '{agent_name} đã bắt đầu một cuộc họp',
    ],
    'slack' => [
        'name' => 'Slack',
        'short_description' => 'Nhận thông báo và trả lời hội thoại ngay trong Slack.',
        'description' => 'Nối {installationName} với Slack để cả đội cùng nắm thông tin. Kết nối này cho phép bạn nhận thông báo hội thoại mới và trả lời ngay trong giao diện Slack.',
    ],
    'webhooks' => [
        'name' => 'Webhook',
        'description' => 'Sự kiện webhook báo tức thời mọi hoạt động trong tài khoản {installationName} của bạn. Bạn đăng ký những sự kiện mình cần, {installationName} sẽ gửi HTTP callback kèm nội dung cập nhật.',
    ],
    'dialogflow' => [
        'name' => 'Dialogflow',
        'short_description' => 'Dựng chatbot trả lời các câu hỏi đầu tiên trước khi chuyển cho nhân viên.',
        'description' => 'Dựng chatbot bằng Dialogflow rồi gắn vào hộp thư của bạn. Bot có thể trả lời những câu hỏi đầu tiên trước khi chuyển hội thoại cho nhân viên chăm sóc khách hàng.',
    ],
    'google_translate' => [
        'name' => 'Google Translate',
        'short_description' => 'Tự động dịch tin nhắn của khách cho nhân viên.',
        'description' => 'Nối Google Translate để nhân viên dễ dàng dịch tin nhắn của khách. Kết nối này tự nhận diện ngôn ngữ và chuyển sang ngôn ngữ ưa dùng của nhân viên hoặc quản trị viên.',
    ],
    'openai' => [
        'name' => 'OpenAI',
        'short_description' => 'Gợi ý câu trả lời, tóm tắt và trau chuốt tin nhắn bằng AI.',
        'description' => 'Tận dụng sức mạnh mô hình ngôn ngữ lớn của OpenAI với các tính năng như gợi ý câu trả lời, tóm tắt, viết lại tin nhắn, kiểm tra chính tả và phân loại nhãn.',
    ],
    'linear' => [
        'name' => 'Linear',
        'short_description' => 'Tạo và gắn issue Linear ngay từ hội thoại.',
        'description' => 'Tạo issue trong Linear ngay từ cửa sổ hội thoại. Hoặc gắn issue Linear có sẵn để theo dõi công việc gọn gàng và hiệu quả hơn.',
    ],
    'notion' => [
        'name' => 'Notion',
        'short_description' => 'Nối cơ sở dữ liệu, tài liệu và trang thẳng vào Captain.',
        'description' => 'Kết nối workspace Notion để Captain đọc được nội dung trong cơ sở dữ liệu, tài liệu và trang của bạn, từ đó trả lời khách sát bối cảnh hơn.',
    ],
    'shopify' => [
        'name' => 'Shopify',
        'short_description' => 'Xem thông tin đơn hàng và khách hàng từ cửa hàng Shopify của bạn.',
        'description' => 'Kết nối cửa hàng Shopify để xem thông tin đơn hàng, khách hàng và sản phẩm ngay trong hội thoại, giúp đội hỗ trợ trả lời nhanh và sát bối cảnh hơn.',
    ],
    'leadsquared' => [
        'name' => 'LeadSquared',
        'short_description' => 'Đồng bộ liên hệ và hội thoại với CRM LeadSquared.',
        'description' => 'Đồng bộ liên hệ và hội thoại với CRM LeadSquared. Kết nối này tự tạo lead trong LeadSquared khi có liên hệ mới và ghi lại hoạt động hội thoại để đội bán hàng nắm đầy đủ bối cảnh.',
    ],
];
