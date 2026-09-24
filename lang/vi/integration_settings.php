<?php

// Bản dịch tiếng Việt của lang/en/integration_settings.php.

return [
    'SHOPIFY' => [
        'HEADER' => 'Shopify',
        'DELETE' => [
            'TITLE' => 'Xóa kết nối Shopify',
            'MESSAGE' => 'Bạn chắc chắn muốn xóa kết nối Shopify?',
        ],
        'STORE_URL' => [
            'TITLE' => 'Kết nối cửa hàng Shopify',
            'LABEL' => 'URL cửa hàng',
            'PLACEHOLDER' => 'cua-hang-cua-ban.myshopify.com',
            'HELP' => 'Nhập URL myshopify.com của cửa hàng Shopify',
            'CANCEL' => 'Huỷ',
            'SUBMIT' => 'Kết nối cửa hàng',
        ],
        'ERROR' => 'Có lỗi khi kết nối Shopify. Bạn hãy thử lại hoặc liên hệ hỗ trợ nếu vẫn không được.',
    ],
    'HEADER' => 'Tích hợp',
    'DESCRIPTION' => '{installationName} kết nối với nhiều công cụ và dịch vụ để đội của bạn làm việc hiệu quả hơn. Xem danh sách bên dưới để cấu hình ứng dụng bạn thích.',
    'LEARN_MORE' => 'Tìm hiểu thêm về kết nối',
    'LOADING' => 'Đang tải danh sách kết nối',
    'SEARCH_PLACEHOLDER' => 'Tìm kết nối...',
    'NO_RESULTS' => 'Không tìm thấy kết nối nào khớp',
    'CAPTAIN' => [
        'DISABLED' => 'Tài khoản của bạn chưa bật Captain.',
        'CLICK_HERE_TO_CONFIGURE' => 'Bấm vào đây để cấu hình',
        'LOADING_CONSOLE' => 'Đang tải Captain Console...',
        'FAILED_TO_LOAD_CONSOLE' => 'Không tải được Captain Console. Hãy tải lại trang và thử lại.',
    ],
    'WEBHOOK' => [
        'SUBSCRIBED_EVENTS' => 'Những sự kiện được theo dõi',
        'LEARN_MORE' => 'Tìm hiểu thêm về webhook',
        'PAYWALL' => [
            'TITLE' => 'Webhook có ở các gói trả phí',
            'AVAILABLE_ON' => 'Dùng webhook để nhận sự kiện tức thời từ tài khoản {installationName} của bạn.',
            'UPGRADE_PROMPT' => 'Hãy nâng cấp lên gói Startups, Business hoặc Enterprise để dùng webhook.',
            'UPGRADE_NOW' => 'Nâng cấp ngay',
            'CANCEL_ANYTIME' => 'Bạn có thể đổi hoặc hủy gói bất cứ lúc nào.',
        ],
        'SECRET' => [
            'LABEL' => 'Khóa bí mật',
            'COPY' => 'Chép khóa bí mật',
            'COPY_SUCCESS' => 'Đã chép khóa bí mật',
            'TOGGLE' => 'Ẩn/hiện khóa bí mật',
            'CREATED_DESC' => 'Đã tạo webhook. Dùng khóa bí mật bên dưới để xác minh chữ ký webhook. Hãy chép ngay — bạn cũng có thể xem lại trong biểu mẫu sửa webhook.',
            'DONE' => 'Xong',
        ],
        'COUNT' => '{n} webhook | {n} webhook',
        'SEARCH_PLACEHOLDER' => 'Tìm webhook...',
        'NO_RESULTS' => 'Không tìm thấy webhook nào khớp',
        'FORM' => [
            'CANCEL' => 'Huỷ',
            'DESC' => 'Webhook events cung cấp cho bạn thông tin thời gian thực về những gì đang xảy ra trong tài khoản {installationName} của bạn. Vui lòng nhập một URL hợp lệ để định cấu hình một cuộc gọi lại.',
            'SUBSCRIPTIONS' => [
                'LABEL' => 'Các sự kiện',
                'EVENTS' => [
                    'CONVERSATION_CREATED' => 'Hội thoại đã được tạo',
                    'CONVERSATION_STATUS_CHANGED' => 'Trạng thái hội thoại đã thay đổi',
                    'CONVERSATION_UPDATED' => 'Hội thoại đã được cập nhật',
                    'MESSAGE_CREATED' => 'Tin nhắn đã được tạo',
                    'MESSAGE_UPDATED' => 'Tin nhắn đã được cập nhật',
                    'WEBWIDGET_TRIGGERED' => 'Tiện ích trò chuyện trực tuyến do người dùng mở',
                    'CONTACT_CREATED' => 'Tạo liên hệ',
                    'CONTACT_UPDATED' => 'Cập nhật liên hệ',
                    'CONVERSATION_TYPING_ON' => 'Bắt đầu gõ trong hội thoại',
                    'CONVERSATION_TYPING_OFF' => 'Ngừng gõ trong hội thoại',
                    'INBOX_UPDATED' => 'Cập nhật hộp thư',
                ],
            ],
            'NAME' => [
                'LABEL' => 'Tên webhook',
                'PLACEHOLDER' => 'Nhập tên của webhook',
            ],
            'END_POINT' => [
                'LABEL' => 'URL webhook',
                'PLACEHOLDER' => 'Ví dụ: {webhookExampleURL}',
                'ERROR' => 'Vui lòng nhập một URL hợp lệ',
            ],
            'EDIT_SUBMIT' => 'Cập nhật webhook',
            'ADD_SUBMIT' => 'Tạo webhook',
        ],
        'TITLE' => 'Webhook',
        'CONFIGURE' => 'Cấu hình',
        'HEADER' => 'Cài đặt Webhook',
        'HEADER_BTN_TXT' => 'Thêm mới webhook',
        'LOADING' => 'Đang tải về các webhooks',
        'SEARCH_404' => 'Không có kết quả nào được tìm thấy',
        'SIDEBAR_TXT' => '<p><b>Webhooks</b> </p> <p>Webhook là các lệnh gọi lại HTTP có thể được xác định cho mọi tài khoản. Chúng được kích hoạt bởi các sự kiện như tạo tin nhắn trong {installationName}. Bạn có thể tạo nhiều webhook cho tài khoản này. <br /><br /> Để tạo một <b>webhook</b>, click vào <b>Tạo mới</b>. Bạn cũng có thể xóa bất kỳ webhook hiện có nào bằng cách nhấp vào nút Xóa.</p>',
        'LIST' => [
            '404' => 'Không có webhook nào được định cấu hình cho tài khoản này.',
            'TITLE' => 'Quản lý webhooks',
            'TABLE_HEADER' => [
                'WEBHOOK_ENDPOINT' => 'Điểm nhận webhook',
                'ACTIONS' => 'Hành động',
            ],
        ],
        'EDIT' => [
            'BUTTON_TEXT' => 'Chỉnh sửa',
            'TITLE' => 'Sửa webhook',
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã cập nhật cấu hình Webhook thành công',
                'ERROR_MESSAGE' => 'Không thể kết nối với Máy chủ Woot, Vui lòng thử lại sau',
            ],
        ],
        'ADD' => [
            'CANCEL' => 'Xoá',
            'TITLE' => 'Thêm mới webhook',
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã thêm Webhook thành công',
                'ERROR_MESSAGE' => 'Không thể kết nối với Máy chủ Woot, Vui lòng thử lại sau',
            ],
        ],
        'DELETE' => [
            'BUTTON_TEXT' => 'Xoá',
            'API' => [
                'SUCCESS_MESSAGE' => 'Webhook đã được xoá thành công',
                'ERROR_MESSAGE' => 'Không thể kết nối với Máy chủ Woot, Vui lòng thử lại sau',
            ],
            'CONFIRM' => [
                'TITLE' => 'Xác Nhận Xoá',
                'MESSAGE' => 'Bạn có chắc chắn muốn xóa webhook không? ({webhookURL})',
                'YES' => 'Có, Xoá ',
                'NO' => 'Không, Giữ',
            ],
        ],
    ],
    'SLACK' => [
        'HEADER' => 'Slack',
        'DELETE' => 'Xoá',
        'DELETE_CONFIRMATION' => [
            'TITLE' => 'Xóa kết nối',
            'MESSAGE' => 'Bạn chắc chắn muốn xóa kết nối này? Làm vậy sẽ mất quyền xem hội thoại trong workspace Slack của bạn.',
        ],
        'HELP_TEXT' => [
            'TITLE' => 'Dùng tích hợp Slack',
            'BODY' => 'Với kết nối này, mọi hội thoại đến sẽ được đồng bộ sang kênh ***{selectedChannelName}*** trong workspace Slack của bạn. Bạn có thể xử lý toàn bộ hội thoại khách hàng ngay trong kênh đó và không bỏ sót tin nào.

Các tính năng chính của kết nối này:

**Trả lời hội thoại ngay trong Slack:** để trả lời một hội thoại trong kênh Slack ***{selectedChannelName}***, chỉ cần gõ nội dung và gửi dưới dạng thread. {installationName} sẽ gửi nội dung đó tới khách hàng. Đơn giản vậy thôi!

 **Tạo ghi chú riêng:** nếu muốn tạo ghi chú riêng thay vì trả lời, hãy bắt đầu tin nhắn bằng ***`note:`***. Nội dung sẽ được giữ riêng và khách không nhìn thấy.

**Gắn với hồ sơ nhân viên:** nếu người trả lời trên Slack có hồ sơ nhân viên trong {installationName} dùng cùng email, câu trả lời sẽ tự gắn với hồ sơ đó. Nhờ vậy bạn dễ theo dõi ai đã nói gì và lúc nào. Ngược lại, nếu người trả lời không có hồ sơ nhân viên tương ứng, khách sẽ thấy câu trả lời đến từ hồ sơ bot.',
            'SELECTED' => 'đã chọn',
        ],
        'SELECT_CHANNEL' => [
            'OPTION_LABEL' => 'Chọn một kênh',
            'UPDATE' => 'Cập nhật',
            'BUTTON_TEXT' => 'Kết nối kênh',
            'DESCRIPTION' => 'Workspace Slack của bạn đã liên kết với {installationName}. Tuy nhiên kết nối đang tắt. Để bật kết nối và gắn một kênh với {installationName}, hãy bấm nút bên dưới.

**Lưu ý:** nếu bạn định kết nối một kênh riêng tư, hãy thêm ứng dụng {installationName} vào kênh Slack đó trước khi làm bước này.',
            'ATTENTION_REQUIRED' => 'Cần bạn xử lý',
            'EXPIRED' => 'Kết nối Slack của bạn đã hết hạn. Để tiếp tục nhận tin nhắn trên Slack, hãy xóa kết nối rồi kết nối lại workspace.',
        ],
        'UPDATE_ERROR' => 'Có lỗi khi cập nhật kết nối, bạn hãy thử lại',
        'UPDATE_SUCCESS' => 'Đã kết nối kênh',
        'FAILED_TO_FETCH_CHANNELS' => 'Có lỗi khi lấy danh sách kênh từ Slack, bạn hãy thử lại',
    ],
    'DYTE' => [
        'CLICK_HERE_TO_JOIN' => 'Bấm vào đây để tham gia',
        'LEAVE_THE_ROOM' => 'Rời phòng',
        'START_VIDEO_CALL_HELP_TEXT' => 'Bắt đầu cuộc gọi video mới với khách hàng',
        'JOIN_ERROR' => 'Có lỗi khi tham gia cuộc gọi, bạn hãy thử lại',
        'CREATE_ERROR' => 'Có lỗi khi tạo liên kết cuộc họp, bạn hãy thử lại',
    ],
    'OPEN_AI' => [
        'AI_ASSIST' => 'Trợ lý AI',
        'WITH_AI' => ' {option} bằng AI ',
        'OPTIONS' => [
            'REPLY_SUGGESTION' => 'Gợi ý câu trả lời',
            'SUMMARIZE' => 'Tóm tắt',
            'REPHRASE' => 'Viết hay hơn',
            'FIX_SPELLING_GRAMMAR' => 'Sửa chính tả và ngữ pháp',
            'SHORTEN' => 'Rút ngắn',
            'EXPAND' => 'Viết dài hơn',
            'MAKE_FRIENDLY' => 'Đổi giọng văn sang thân thiện',
            'MAKE_FORMAL' => 'Dùng giọng văn trang trọng',
            'SIMPLIFY' => 'Viết đơn giản hơn',
            'CONFIDENT' => 'Dùng giọng văn tự tin',
            'PROFESSIONAL' => 'Dùng giọng văn chuyên nghiệp',
            'CASUAL' => 'Dùng giọng văn thân mật',
            'STRAIGHTFORWARD' => 'Dùng giọng văn thẳng thắn',
        ],
        'REPLY_OPTIONS' => [
            'IMPROVE_REPLY' => 'Cải thiện câu trả lời',
            'IMPROVE_REPLY_SELECTION' => 'Cải thiện phần đang chọn',
            'CHANGE_TONE' => [
                'TITLE' => 'Đổi giọng văn',
                'OPTIONS' => [
                    'PROFESSIONAL' => 'Chuyên nghiệp',
                    'CASUAL' => 'Thân mật',
                    'STRAIGHTFORWARD' => 'Thẳng thắn',
                    'CONFIDENT' => 'Tự tin',
                    'FRIENDLY' => 'Thân thiện',
                ],
            ],
            'GRAMMAR' => 'Sửa ngữ pháp và chính tả',
            'SUGGESTION' => 'Gợi ý câu trả lời',
            'SUMMARIZE' => 'Tóm tắt hội thoại',
            'ASK_COPILOT' => 'Hỏi Copilot',
        ],
        'ASSISTANCE_MODAL' => [
            'DRAFT_TITLE' => 'Nội dung nháp',
            'GENERATED_TITLE' => 'Nội dung đã sinh',
            'AI_WRITING' => 'AI đang viết',
            'BUTTONS' => [
                'APPLY' => 'Dùng gợi ý này',
                'CANCEL' => 'Huỷ',
            ],
        ],
        'CTA_MODAL' => [
            'TITLE' => 'Kết nối với OpenAI',
            'DESC' => 'Mang tính năng AI nâng cao vào bảng điều khiển của bạn bằng các mô hình GPT của OpenAI. Để bắt đầu, hãy nhập API key từ tài khoản OpenAI.',
            'KEY_PLACEHOLDER' => 'Nhập API key OpenAI của bạn',
            'BUTTONS' => [
                'NEED_HELP' => 'Cần hỗ trợ?',
                'DISMISS' => 'Bỏ qua',
                'FINISH' => 'Hoàn tất thiết lập',
            ],
            'DISMISS_MESSAGE' => 'Bạn có thể thiết lập kết nối OpenAI lúc khác, bất cứ khi nào bạn muốn.',
            'SUCCESS_MESSAGE' => 'Đã thiết lập xong kết nối OpenAI',
        ],
        'TITLE' => 'Cải thiện bằng AI',
        'SUMMARY_TITLE' => 'Tóm tắt bằng AI',
        'REPLY_TITLE' => 'Gợi ý câu trả lời bằng AI',
        'SUBTITLE' => 'AI sẽ dựa trên bản nháp hiện tại của bạn để tạo câu trả lời hay hơn.',
        'TONE' => [
            'TITLE' => 'Giọng văn',
            'OPTIONS' => [
                'PROFESSIONAL' => 'Chuyên nghiệp',
                'FRIENDLY' => 'Thân thiện',
            ],
        ],
        'BUTTONS' => [
            'GENERATE' => 'Tạo nội dung',
            'GENERATING' => 'Đang tạo...',
            'CANCEL' => 'Huỷ',
        ],
        'GENERATE_ERROR' => 'There was an error processing the content, please try again',
    ],
    'DELETE' => [
        'BUTTON_TEXT' => 'Xoá',
        'API' => [
            'SUCCESS_MESSAGE' => 'Tích hợp đã được xóa thành công',
        ],
    ],
    'CONNECT' => [
        'BUTTON_TEXT' => 'Kết nối',
    ],
    'DASHBOARD_APPS' => [
        'TITLE' => 'Ứng dụng bảng điều khiển',
        'HEADER_BTN_TXT' => 'Thêm mới một Ứng dụng bảng điều khiển',
        'SIDEBAR_TXT' => '<p> <b> Ứng dụng trên bảng điều khiển</b> </p> <p>Ứng dụng bảng điều khiển cho phép nhúng ứng dụng vào bảng điều khiển {installationName} để cung cấp ngữ cảnh cho các nhân viên hỗ trợ khách hàng. Tính năng này cho phép bạn tạo ứng dụng một cách độc lập và nhúng ứng dụng đó vào bên trong trang điều khiển để cung cấp thông tin người dùng, đơn đặt hàng hoặc lịch sử thanh toán trước đó của họ. </p> <p> Khi bạn nhúng ứng dụng của mình vào {installationName}, ứng dụng của bạn sẽ lấy bối cảnh của hội thoại và liên hệ dưới dạng sự kiện cửa sổ. Triển khai trình nghe cho sự kiện thông báo trên trang của bạn để nhận ngữ cảnh. </p> <p> Để thêm ứng dụng trang điều khiển mới, hãy nhấp vào nút \'Thêm ứng dụng bảng điều khiển mới\'. </p>',
        'DESCRIPTION' => 'Ứng dụng bảng điều khiển cho phép các tổ chức nhúng một ứng dụng bên trong trang điều khiển để cung cấp ngữ cảnh cho các nhân viên hỗ trợ khách hàng. Tính năng này cho phép bạn tạo ứng dụng một cách độc lập và nhúng ứng dụng đó để cung cấp thông tin người dùng, đơn đặt hàng hoặc lịch sử thanh toán trước đó của họ.',
        'LEARN_MORE' => 'Tìm hiểu thêm về Dashboard Apps',
        'COUNT' => '{n} dashboard app | {n} dashboard app',
        'SEARCH_PLACEHOLDER' => 'Tìm dashboard app...',
        'NO_RESULTS' => 'Không tìm thấy dashboard app nào khớp',
        'LIST' => [
            '404' => 'Chưa có ứng dụng trang điều khiển nào được định cấu hình trên tài khoản này',
            'LOADING' => 'Đang tìm nạp ứng dụng bảng điều khiển...',
            'TABLE_HEADER' => [
                'NAME' => 'Tên',
                'ENDPOINT' => 'Điểm cuối',
                'ACTIONS' => 'Hành động',
            ],
            'EDIT_TOOLTIP' => 'Sửa app',
            'DELETE_TOOLTIP' => 'Xoá app',
        ],
        'FORM' => [
            'TITLE_LABEL' => 'Tên',
            'TITLE_PLACEHOLDER' => 'Nhập tên cho ứng dụng bảng điều khiển',
            'TITLE_ERROR' => 'Cần có tên cho ứng dụng bảng điều khiển',
            'URL_LABEL' => 'Điểm cuối',
            'URL_PLACEHOLDER' => 'Nhập URL endpoint nơi ứng dụng của bạn được lưu trữ',
            'URL_ERROR' => 'Cần một URL hợp lệ',
        ],
        'CREATE' => [
            'HEADER' => 'Thêm mới một Ứng dụng bảng điều khiển',
            'FORM_SUBMIT' => 'Gửi',
            'FORM_CANCEL' => 'Huỷ',
            'API_SUCCESS' => 'Ứng dụng trang điều khiển được định cấu hình thành công',
            'API_ERROR' => 'Chúng tôi không thể tạo ứng dụng. Vui lòng thử lại sau',
        ],
        'UPDATE' => [
            'HEADER' => 'Sửa app bảng điều khiển',
            'FORM_SUBMIT' => 'Cập nhật',
            'FORM_CANCEL' => 'Huỷ',
            'API_SUCCESS' => 'Đã cập nhật ứng dụng trang điều khiển thành công',
            'API_ERROR' => 'Chúng tôi không thể cập nhật ứng dụng. Vui lòng thử lại sau',
        ],
        'DELETE' => [
            'CONFIRM_YES' => 'Có, xóa nó',
            'CONFIRM_NO' => 'Không, giữ nó',
            'TITLE' => 'Xác nhận xoá',
            'MESSAGE' => 'Bạn có chắc chắn xóa ứng dụng - {appName}?',
            'API_SUCCESS' => 'Đã xóa ứng dụng trang điều khiển thành công',
            'API_ERROR' => 'Chúng tôi không thể xóa ứng dụng. Vui lòng thử lại sau',
        ],
    ],
    'LINEAR' => [
        'HEADER' => 'Linear',
        'ADD_OR_LINK_BUTTON' => 'Tạo/gắn issue Linear',
        'LOADING' => 'Đang tải issue Linear...',
        'LOADING_ERROR' => 'Có lỗi khi tải issue Linear, bạn hãy thử lại',
        'CREATE' => 'Tạo',
        'LINK' => [
            'SEARCH' => 'Tìm issue',
            'SELECT' => 'Chọn issue',
            'TITLE' => 'Liên kết',
            'EMPTY_LIST' => 'Không có issue Linear nào',
            'LOADING' => 'Đang tải',
            'ERROR' => 'Có lỗi khi tải issue Linear, bạn hãy thử lại',
            'LINK_SUCCESS' => 'Đã gắn issue',
            'LINK_ERROR' => 'Có lỗi khi gắn issue, bạn hãy thử lại',
            'LINK_TITLE' => 'Hội thoại (#{conversationId}) với {name}',
        ],
        'ADD_OR_LINK' => [
            'TITLE' => 'Tạo/gắn issue Linear',
            'DESCRIPTION' => 'Tạo issue Linear từ hội thoại, hoặc gắn issue có sẵn để theo dõi liền mạch.',
            'FORM' => [
                'TITLE' => [
                    'LABEL' => 'Tiêu đề',
                    'PLACEHOLDER' => 'Nhập tiêu đề',
                    'REQUIRED_ERROR' => 'Tiêu đề bắt buộc có',
                ],
                'DESCRIPTION' => [
                    'LABEL' => 'Mô tả',
                    'PLACEHOLDER' => 'Nhập mô tả',
                ],
                'TEAM' => [
                    'LABEL' => 'Nhóm',
                    'PLACEHOLDER' => 'Chọn nhóm',
                    'SEARCH' => 'Tìm nhóm',
                    'REQUIRED_ERROR' => 'Nhóm là bắt buộc',
                ],
                'ASSIGNEE' => [
                    'LABEL' => 'Người phụ trách',
                    'PLACEHOLDER' => 'Chọn người phụ trách',
                    'SEARCH' => 'Tìm người phụ trách',
                ],
                'PRIORITY' => [
                    'LABEL' => 'Mức độ ưu tiên',
                    'PLACEHOLDER' => 'Chọc mức ưu tiên',
                    'SEARCH' => 'Tìm mức ưu tiên',
                ],
                'LABEL' => [
                    'LABEL' => 'Nhãn',
                    'PLACEHOLDER' => 'Chọn nhãn',
                    'SEARCH' => 'Tìm nhãn',
                ],
                'STATUS' => [
                    'LABEL' => 'Trạng thái',
                    'PLACEHOLDER' => 'Chọn trạng thái',
                    'SEARCH' => 'Tìm trạng thái',
                ],
                'PROJECT' => [
                    'LABEL' => 'Dự án',
                    'PLACEHOLDER' => 'Chọn dự án',
                    'SEARCH' => 'Tìm dự án',
                ],
            ],
            'CREATE' => 'Tạo',
            'CANCEL' => 'Huỷ',
            'CREATE_SUCCESS' => 'Đã tạo issue',
            'CREATE_ERROR' => 'Có lỗi khi tạo issue, bạn hãy thử lại',
            'LOADING_TEAM_ERROR' => 'Có lỗi khi tải danh sách nhóm, bạn hãy thử lại',
            'LOADING_TEAM_ENTITIES_ERROR' => 'Có lỗi khi tải dữ liệu của nhóm, bạn hãy thử lại',
        ],
        'ISSUE' => [
            'STATUS' => 'Trạng thái',
            'PRIORITY' => 'Mức độ ưu tiên',
            'ASSIGNEE' => 'Người phụ trách',
            'LABELS' => 'Nhãn',
            'CREATED_AT' => 'Tạo lúc {createdAt}',
        ],
        'UNLINK' => [
            'TITLE' => 'Bỏ gắn',
            'SUCCESS' => 'Đã bỏ gắn issue',
            'ERROR' => 'Có lỗi khi bỏ gắn issue, bạn hãy thử lại',
        ],
        'NO_LINKED_ISSUES' => 'Không có issue nào được gắn',
        'DELETE' => [
            'TITLE' => 'Bạn chắc chắn muốn xóa kết nối này?',
            'MESSAGE' => 'Bạn chắc chắn muốn xóa kết nối này?',
            'CONFIRM' => 'Có, xoá',
            'CANCEL' => 'Huỷ',
        ],
        'CTA' => [
            'TITLE' => 'Kết nối với Linear',
            'AGENT_DESCRIPTION' => 'Chưa kết nối workspace Linear. Hãy nhờ quản trị viên kết nối workspace để dùng tính năng này.',
            'DESCRIPTION' => 'Chưa kết nối workspace Linear. Bấm nút bên dưới để kết nối workspace và dùng tính năng này.',
            'BUTTON_TEXT' => 'Kết nối workspace Linear',
        ],
    ],
    'NOTION' => [
        'HEADER' => 'Notion',
        'DELETE' => [
            'TITLE' => 'Bạn chắc chắn muốn xóa kết nối Notion?',
            'MESSAGE' => 'Xóa kết nối này sẽ gỡ quyền truy cập workspace Notion của bạn và dừng mọi tính năng liên quan.',
            'CONFIRM' => 'Có, xoá',
            'CANCEL' => 'Huỷ',
        ],
    ],
];
