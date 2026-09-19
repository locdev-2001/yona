<?php

return [
    'meta' => [
        'title' => 'Yona · CRM hội thoại cho SME Việt',
        'description' => 'Gom tin nhắn khách từ Zalo, Messenger, TikTok về một hộp thư. Biến hội thoại thành khách hàng và tự động hóa chăm sóc.',
    ],

    'nav' => [
        'features' => 'Tính năng',
        'pricing' => 'Bảng giá',
        'login' => 'Đăng nhập',
        'register' => 'Dùng thử',
        'dashboard' => 'Vào Dashboard',
        'back_to_home' => 'Về trang chủ',
        'language' => 'Ngôn ngữ',
    ],

    'cta' => [
        'primary' => 'Dùng thử miễn phí',
        'secondary' => 'Xem hộp thư',
        'learn' => 'Tìm hiểu thêm',
    ],

    'hero' => [
        'title_lead' => 'Gom mọi tin nhắn khách',
        'title_focus' => 'về một hộp thư',
        'title_tail' => 'và chốt đơn nhanh hơn',
        'subtitle' => 'Yona là CRM lấy hội thoại làm cửa vào. Khách nhắn ở Zalo, Messenger hay website đều về cùng một nơi, và tự thành hồ sơ khách hàng.',
        'cta_primary' => 'Dùng thử miễn phí',
        'cta_secondary' => 'Đăng nhập',
        'fine' => 'Miễn phí khi đang hoàn thiện. Không cần thẻ tín dụng.',
        'cta_dashboard' => 'Vào Dashboard',
    ],

    'showcase' => [
        'title_lead' => 'Hai mặt,',
        'title_focus' => 'một luồng dữ liệu',
        'tabs' => [
            'inbox' => 'Hộp thư hội thoại',
            'records' => 'Hồ sơ khách hàng',
        ],
    ],

    'channels' => [
        'eyebrow' => 'Khách nhắn ở đâu, Yona nhận ở đó',
        'note' => 'Thêm kênh là thêm driver, không phải xây lại hệ thống.',
    ],

    'features' => [
        'inbox' => [
            'eyebrow' => 'Hộp thư hội thoại',
            'title_a' => 'Một hộp thư cho cả đội,',
            'title_b' => 'mọi kênh đổ về',
            'body' => 'Zalo, Messenger và website cùng vào một danh sách. Cả đội nhìn chung một hội thoại theo thời gian thực, nên không ai trả lời trùng và không tin nào rơi.',
            'cards' => [
                'collision' => [
                    'title' => 'Không ai trả lời trùng',
                    'body' => 'Người khác mở hội thoại là bạn thấy ngay. Giao việc và nhắc nhau bằng ghi chú riêng, khách không đọc được.',
                ],
                'history' => [
                    'title' => 'Lịch sử nằm cạnh tin nhắn',
                    'body' => 'Nhãn, ghi chú, người phụ trách và mọi lần trao đổi trước đó ở cùng một màn hình. Không phải mở thêm ứng dụng nào.',
                ],
                'mobile' => [
                    'title' => 'Trả lời được từ điện thoại',
                    'body' => 'Giao diện gọn lại vừa màn hình nhỏ, giữ nguyên thao tác. Đang đi đường vẫn chốt được đơn.',
                ],
            ],
        ],

        'zalo' => [
            'eyebrow' => 'Zalo cá nhân',
            'title_a' => 'Kênh mà các CRM khác',
            'title_b' => 'bỏ trống',
            'body' => 'Phần lớn SME Việt bán hàng bằng Zalo cá nhân chứ không phải Official Account. Yona nhận cả hai, và tin nhắn Zalo cá nhân đi vào cùng hộp thư với mọi kênh còn lại.',
            'cards' => [
                'qr' => [
                    'title' => 'Kết nối bằng quét QR',
                    'body' => 'Mở Yona, quét mã, xong. Không chờ duyệt Official Account, không cần giấy phép doanh nghiệp.',
                ],
                'filter' => [
                    'title' => 'Lọc trước khi vào hệ thống',
                    'body' => 'Bạn chọn hội thoại nào được đưa vào CRM. Chuyện riêng vẫn nằm ngoài dữ liệu công ty.',
                ],
                'key' => [
                    'title' => 'Số điện thoại là khóa',
                    'body' => 'Cùng một số trên Zalo và Messenger sẽ gộp thành một hồ sơ, không tách ra thành hai khách.',
                ],
            ],
        ],

        'crm' => [
            'eyebrow' => 'Hồ sơ và pipeline',
            'title_a' => 'Hội thoại tự trở thành',
            'title_b' => 'hồ sơ khách hàng',
            'body' => 'Người lạ nhắn lần đầu thành liên hệ nháp, ghi rõ đến từ kênh nào. Khi xác nhận có nhu cầu thật thì một chạm là thành Lead và vào đúng giai đoạn pipeline.',
            'cards' => [
                'draft' => [
                    'title' => 'Người lạ chưa phải Lead',
                    'body' => 'Ai nhắn cũng chỉ thành liên hệ nháp. Vào pipeline khi đã xác nhận nhu cầu, nên số liệu không bị thổi phồng.',
                ],
                'source' => [
                    'title' => 'Luôn biết khách từ đâu',
                    'body' => 'Mỗi hồ sơ ghi lại kênh đầu tiên. Biết kênh nào ra đơn thì mới biết nên đổ công vào đâu.',
                ],
                'respect' => [
                    'title' => 'Tôn trọng luật và người nhận',
                    'body' => 'Chỉ gửi trong khung 7h tới 22h, tối đa ba tin quảng cáo mỗi số mỗi ngày, luôn có đường từ chối.',
                ],
            ],
        ],
    ],

    'flow' => [
        'eyebrow' => 'Vòng đời hội thoại',
        'title' => 'Từ tin nhắn tới đơn chốt',
        'subtitle' => 'Hội thoại đi hết vòng đời trong một hệ thống, không phải chép tay sang chỗ khác.',
        'steps' => [
            'capture' => ['title' => 'Nhận', 'description' => 'Khách nhắn. Hệ thống tạo liên hệ nháp và ghi rõ đến từ kênh nào.'],
            'qualify' => ['title' => 'Xác nhận', 'description' => 'Có nhu cầu thật thì một chạm thành Lead, vào đúng giai đoạn pipeline.'],
            'nurture' => ['title' => 'Chăm', 'description' => 'Workflow tự nhắn, tạo việc và gắn nhãn theo kịch bản đã đặt sẵn.'],
            'close' => ['title' => 'Chốt', 'description' => 'Kéo thả qua các giai đoạn cho tới khi thành khách hàng.'],
        ],
    ],

    'rules' => [
        'eyebrow' => 'Làm cho thị trường Việt',
        'title' => 'Bốn thứ chúng tôi không thỏa hiệp',
        'items' => [
            'dedupe' => [
                'title' => 'Một người, một hồ sơ',
                'description' => 'Cùng số điện thoại thì gộp làm một, dù đến từ Zalo hôm nay và Messenger tháng sau.',
            ],
            'draft' => [
                'title' => 'Người lạ chưa phải Lead',
                'description' => 'Ai nhắn cũng thành liên hệ nháp. Chỉ vào pipeline khi đã xác nhận có nhu cầu, để số liệu không bị thổi phồng.',
            ],
            'source' => [
                'title' => 'Luôn biết khách từ đâu',
                'description' => 'Mỗi hồ sơ ghi rõ kênh đầu tiên. Biết kênh nào ra đơn thì mới biết nên đổ công vào đâu.',
            ],
            'respect' => [
                'title' => 'Tôn trọng luật và người nhận',
                'description' => 'Chỉ gửi trong khung 7h tới 22h, tối đa ba tin quảng cáo mỗi số mỗi ngày, luôn có đường từ chối.',
            ],
        ],
    ],

    'pricing' => [
        'title' => 'Hiện tại dùng không giới hạn',
        'subtitle' => 'Yona đang trong giai đoạn hoàn thiện. Chúng tôi đếm số hội thoại để xây chính sách gói cước, nhưng chưa chặn gì cả.',
        'plan' => 'Bản đang hoàn thiện',
        'price' => '0đ',
        'unit' => 'mỗi tháng',
        'points' => [
            'unlimited' => 'Không giới hạn hội thoại, kênh hay thành viên',
            'no_card' => 'Không cần thẻ tín dụng',
            'notice' => 'Khi có gói thu phí, chúng tôi báo trước',
        ],
        'cta' => 'Bắt đầu ngay',
        'fine' => 'Bộ đếm hội thoại vẫn chạy để chúng tôi hiểu cách bạn dùng, nhưng không có hạn mức nào đang áp.',
    ],

    'closing' => [
        'title' => 'Thử bằng chính tin nhắn của bạn',
        'subtitle' => 'Kết nối một kênh, đổ hội thoại thật vào và xem nó chạy. Mất vài phút.',
        'cta_primary' => 'Dùng thử miễn phí',
        'cta_secondary' => 'Đăng nhập',
    ],

    'footer' => [
        'tagline' => 'CRM hội thoại và tự động hóa cho SME Việt.',
        'copyright' => '© :year Yona. Đã đăng ký bản quyền.',
        'product' => 'Sản phẩm',
        'account' => 'Tài khoản',
        'language' => 'Ngôn ngữ',
        'note' => 'Sản phẩm của người Việt, làm cho thị trường Việt.',
    ],
];
