<?php

return [
    'meta' => [
        'title' => 'Yona · CRM hội thoại cho SME Việt',
        'description' => 'Gom tin nhắn khách từ Zalo cá nhân, website và email về một hộp thư. Biến hội thoại thành hồ sơ khách hàng, tự động gắn nhãn và phân công theo quy tắc.',
    ],

    'nav' => [
        'features' => 'Tính năng',
        'pricing' => 'Bảng giá',
        'login' => 'Đăng nhập',
        'register' => 'Dùng thử',
        'dashboard' => 'Vào Dashboard',
        'back_to_home' => 'Về trang chủ',
        'language' => 'Ngôn ngữ',
        'menu' => 'Menu',
        'menu_close' => 'Đóng menu',
        'demo' => 'Đặt lịch demo',
        'zalo' => 'Zalo cá nhân',
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
        'subtitle' => 'Yona là CRM lấy hội thoại làm cửa vào. Khách nhắn ở Zalo, website hay email đều về cùng một nơi, và tự thành hồ sơ khách hàng.',
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
        'coming_soon' => 'Sắp có: :channels.',
        'note' => 'Thêm kênh là thêm driver, không phải xây lại hệ thống.',
    ],

    'features' => [
        'inbox' => [
            'eyebrow' => 'Hộp thư hội thoại',
            'title_a' => 'Một hộp thư cho cả đội,',
            'title_b' => 'mọi kênh đổ về',
            'body' => 'Zalo, website và email cùng vào một danh sách. Cả đội nhìn chung một hội thoại theo thời gian thực, nên không ai trả lời trùng và không tin nào rơi.',
            'cards' => [
                'collision' => [
                    'title' => 'Không ai trả lời trùng',
                    'body' => 'Đồng nghiệp đang gõ trả lời là bạn thấy ngay. Giao hội thoại cho đúng người và nhắc nhau bằng ghi chú riêng, khách không đọc được.',
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
            'title_a' => 'Kênh mà nhiều CRM',
            'title_b' => 'bỏ trống',
            'body' => 'Phần lớn SME Việt bán hàng bằng Zalo cá nhân chứ không phải Official Account. Yona kết nối thẳng vào Zalo cá nhân, và tin nhắn đi vào cùng hộp thư với mọi kênh còn lại.',
            'cards' => [
                'qr' => [
                    'title' => 'Kết nối bằng quét QR',
                    'body' => 'Mở Yona, quét mã, xong. Không chờ duyệt Official Account, không cần giấy phép doanh nghiệp.',
                ],
                'reply' => [
                    'title' => 'Trả lời từ Yona, khách nhận trên Zalo',
                    'body' => 'Tin bạn gửi trong hộp thư đi ra từ chính tài khoản Zalo bạn đang bán hàng. Thu hồi và thả cảm xúc cũng đi hai chiều.',
                ],
                'key' => [
                    'title' => 'Số điện thoại là khóa',
                    'body' => 'Cùng một số trên Zalo và website sẽ gộp thành một hồ sơ, không tách ra thành hai khách.',
                ],
            ],
        ],

        'crm' => [
            'eyebrow' => 'Hồ sơ khách hàng',
            'title_a' => 'Hội thoại tự trở thành',
            'title_b' => 'hồ sơ khách hàng',
            'body' => 'Ai nhắn tới cũng có hồ sơ, kèm lịch sử mọi lần trao đổi và kênh khách đã dùng. Nhãn, ghi chú và thuộc tính riêng của bạn nằm cùng một chỗ.',
            'cards' => [
                'draft' => [
                    'title' => 'Người lạ chưa vào danh sách',
                    'body' => 'Người nhắn tới mà chưa có số điện thoại hay email là liên hệ nháp. Có số hoặc email rồi mới vào danh sách liên hệ, nên danh sách không bị thổi phồng.',
                ],
                'source' => [
                    'title' => 'Luôn biết khách từ đâu',
                    'body' => 'Mỗi hội thoại ghi rõ kênh nó đến. Báo cáo theo từng kênh cho thấy kênh nào đông khách, để biết nên đổ công vào đâu.',
                ],
                'attributes' => [
                    'title' => 'Trường thông tin của riêng bạn',
                    'body' => 'Thêm thuộc tính tùy biến như size, ngày sinh hay mã đơn, rồi lọc danh sách liên hệ theo đúng các trường đó. Nhập và xuất CSV khi cần.',
                ],
            ],
        ],
    ],

    'flow' => [
        'eyebrow' => 'Vòng đời hội thoại',
        'title' => 'Từ tin nhắn đầu tới lúc xong việc',
        'subtitle' => 'Hội thoại đi hết vòng đời trong một hệ thống, không phải chép tay sang chỗ khác.',
        'steps' => [
            'capture' => ['title' => 'Nhận', 'description' => 'Khách nhắn. Hệ thống tạo hồ sơ và ghi rõ hội thoại đến từ kênh nào.'],
            'assign' => ['title' => 'Giao', 'description' => 'Quy tắc tự động gắn nhãn và giao hội thoại cho đúng người hoặc đúng nhóm, theo điều kiện bạn đặt.'],
            'reply' => ['title' => 'Trả lời', 'description' => 'Câu trả lời mẫu và macro lo phần câu hỏi lặp lại. Cần người khác vào thì nhắc tên họ trong ghi chú riêng.'],
            'resolve' => ['title' => 'Xong', 'description' => 'Đánh dấu đã xử lý, mời khách chấm điểm hài lòng, và xem báo cáo đội trả lời nhanh tới đâu.'],
        ],
    ],

    'rules' => [
        'eyebrow' => 'Làm cho thị trường Việt',
        'title' => 'Bốn thứ chúng tôi không thỏa hiệp',
        'items' => [
            'dedupe' => [
                'title' => 'Một người, một hồ sơ',
                'description' => 'Cùng số điện thoại thì gộp làm một, dù đến từ Zalo hôm nay và website tháng sau.',
            ],
            'draft' => [
                'title' => 'Người lạ chưa vào danh sách',
                'description' => 'Ai nhắn cũng có hồ sơ, nhưng chưa có số điện thoại hay email thì chỉ là liên hệ nháp, chưa vào danh sách liên hệ. Số liệu vì thế không bị thổi phồng.',
            ],
            'source' => [
                'title' => 'Luôn biết khách từ đâu',
                'description' => 'Mỗi hội thoại ghi rõ kênh nó đến. Biết kênh nào đông khách thì mới biết nên đổ công vào đâu.',
            ],
            'inbound' => [
                'title' => 'Không để rơi tin khách',
                'description' => 'Không có hạn mức sử dụng nào chặn tin đến hay hội thoại mới. Dùng nhiều đến đâu, khách nhắn vẫn vào hộp thư.',
            ],
        ],
    ],

    'pricing' => [
        'title' => 'Hiện tại dùng không giới hạn',
        'subtitle' => 'Yona đang trong giai đoạn hoàn thiện. Chưa có gói thu phí nào, nên không có tính năng nào bị khóa sau gói trả tiền.',
        'plan' => 'Bản đang hoàn thiện',
        'price' => '0đ',
        'unit' => 'mỗi tháng',
        'points' => [
            'unlimited' => 'Không giới hạn hội thoại, kênh hay thành viên',
            'no_card' => 'Không cần thẻ tín dụng',
            'notice' => 'Khi có gói thu phí, chúng tôi báo trước',
        ],
        'cta' => 'Bắt đầu ngay',
        'fine' => 'Không có hạn mức nào đang áp. Danh sách liên hệ xuất được ra tệp CSV bất cứ lúc nào, dữ liệu là của bạn.',
    ],

    'closing' => [
        'title' => 'Thử với tin nhắn của bạn',
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

    'demo' => [
        'meta' => [
            'title' => 'Đặt lịch demo Yona · 15 phút, kết nối Zalo ngay trong buổi gọi',
            'description' => 'Để lại tên và số điện thoại, chúng tôi gọi lại trong giờ làm việc. Buổi gọi 15 phút, kết nối Zalo của bạn ngay tại chỗ.',
        ],
        'eyebrow' => 'Đặt lịch demo',
        'title' => 'Để lại số, chúng tôi gọi lại',
        'lead' => 'Một buổi 15 phút. Chúng tôi kết nối Zalo của bạn ngay trong buổi gọi, không cần cài gì trước.',
        'promise' => [
            'connect' => 'Quét QR kết nối Zalo cá nhân ngay trong buổi gọi, bạn xem tin nhắn thật chạy về hộp thư.',
            'fit' => 'Nói thẳng chỗ nào Yona làm được, chỗ nào chưa. Chưa có thì chúng tôi nói là chưa có.',
            'callback' => 'Gọi lại trong giờ làm việc, từ 8h tới 18h các ngày trong tuần.',
        ],
        'form' => [
            'legend' => 'Thông tin liên hệ',
            'name_label' => 'Tên bạn',
            'name_placeholder' => 'Ví dụ: Trần Thu Hà',
            'phone_label' => 'Số điện thoại',
            'phone_placeholder' => '0912 345 678',
            'phone_hint' => 'Số này cũng là số Zalo thì tốt nhất, chúng tôi nhắn trước khi gọi.',
            'phone_invalid' => 'Số điện thoại chưa đúng. Nhập dạng 0912345678 hoặc +84912345678.',
            'note_label' => 'Bạn đang bán gì, đang gặp vướng ở đâu (không bắt buộc)',
            'note_placeholder' => 'Ví dụ: shop mỹ phẩm, ba bạn cùng trả lời một số Zalo, hay bị trùng khách.',
            'honeypot_label' => 'Website',
            'submit' => 'Gửi và chờ gọi lại',
            'required_note' => 'Dấu * là ô bắt buộc.',
            'privacy' => 'Chúng tôi dùng số của bạn để liên hệ về Yona, không bán cho ai và không thêm vào danh sách quảng cáo.',
            'failed' => 'Gửi không thành công. Bạn thử lại, hoặc nhắn Zalo và gọi hotline bên dưới, cách nào cũng tới đúng người.',
        ],
        'alt' => [
            'title' => 'Muốn nhắn ngay thay vì chờ gọi lại',
            'hotline' => 'Gọi hotline',
            'zalo' => 'Nhắn Zalo',
            'note' => 'Bạn cũng có thể bấm bong bóng chat ở góc phải, đó chính là Yona đang chạy thật.',
        ],
        'thanks' => [
            'meta' => [
                'title' => 'Đã nhận yêu cầu đặt lịch demo · Yona',
                'description' => 'Chúng tôi đã nhận thông tin của bạn và sẽ gọi lại trong giờ làm việc.',
            ],
            'eyebrow' => 'Đã nhận',
            'title' => 'Đã nhận. Chúng tôi gọi lại trong giờ làm việc.',
            'lead' => 'Yêu cầu của bạn đã nằm trong hộp thư của chúng tôi, cùng chỗ với tin nhắn khách hàng. Không cần gửi lại.',
            'next' => [
                'when' => 'Trong giờ làm việc, từ 8h tới 18h các ngày trong tuần.',
                'how' => 'Chúng tôi nhắn Zalo trước rồi mới gọi, để bạn biết ai đang gọi.',
                'prepare' => 'Bạn chuẩn bị điện thoại có Zalo đang đăng nhập là đủ.',
            ],
            'cta_home' => 'Về trang chủ',
            'cta_zalo' => 'Xem Yona làm gì với Zalo cá nhân',
        ],
    ],

    'zalo_page' => [
        'meta' => [
            'title' => 'Quản lý khách Zalo cá nhân · Yona',
            'description' => 'Gom tin nhắn Zalo cá nhân của cả nhóm về một hộp thư dùng chung. Quét QR một lần, khách thành hồ sơ, số điện thoại là khoá chống trùng.',
        ],
        'hero' => [
            'eyebrow' => 'Zalo cá nhân',
            'title_a' => 'Bán bằng Zalo cá nhân,',
            'title_b' => "quản như một\u{00A0}hộp\u{00A0}thư",
            'lead' => 'Quét QR một lần. Tin nhắn khách từ Zalo cá nhân đổ về hộp thư dùng chung, ai trả lời cũng thấy, và mỗi khách tự thành một hồ sơ.',
            'cta_primary' => 'Đặt lịch demo',
            'cta_secondary' => 'Xem các kênh khác',
        ],
        'problem' => [
            'eyebrow' => 'Vấn đề',
            'title' => 'Zalo cá nhân bán tốt, nhưng không quản được',
            'items' => [
                'mixed' => [
                    'title' => 'Tin khách lẫn tin riêng',
                    'description' => 'Đơn hàng nằm giữa tin gia đình và nhóm bạn. Tìm lại một cuộc trao đổi ba ngày trước là dò tay.',
                ],
                'shared' => [
                    'title' => 'Nhiều người, một máy',
                    'description' => 'Cả nhóm dùng chung một điện thoại để trả lời. Ai đang cầm máy thì người khác phải chờ.',
                ],
                'blind' => [
                    'title' => 'Không ai biết ai đã trả lời',
                    'description' => 'Hai người trả lời cùng một khách hai kiểu, hoặc không ai trả lời vì tưởng người kia đã làm.',
                ],
                'lost' => [
                    'title' => 'Khách rơi không dấu vết',
                    'description' => 'Người hỏi giá rồi im. Không có chỗ nào ghi lại để hôm sau nhắn lại, nên khách đó coi như mất.',
                ],
            ],
        ],
        'solution' => [
            'eyebrow' => 'Cách Yona giải',
            'title_a' => 'Một lần quét QR,',
            'title_b' => "cả nhóm dùng chung một\u{00A0}hộp\u{00A0}thư",
            'body' => 'Yona nối vào đúng tài khoản Zalo bạn đang bán, không đổi số, không bắt khách thêm bạn mới. Tin nhắn vào ra vẫn ở Zalo, chỉ thêm một bản trong hộp thư để cả nhóm cùng thấy.',
            'cards' => [
                'qr' => [
                    'title' => 'Quét QR một lần',
                    'body' => 'Đăng nhập bằng mã QR như khi mở Zalo trên máy tính. Không cần đăng ký gì với Zalo.',
                ],
                'shared' => [
                    'title' => 'Hộp thư dùng chung',
                    'body' => 'Mỗi người một tài khoản Yona, cùng nhìn một hàng hội thoại, thấy rõ ai đang trả lời ai.',
                ],
                'draft' => [
                    'title' => 'Người lạ là liên hệ nháp',
                    'body' => 'Người mới nhắn mà chưa có số điện thoại hay email thì chưa vào danh sách liên hệ. Có số, lấy từ hồ sơ Zalo hoặc do bạn nhập, là vào danh sách.',
                ],
                'dedupe' => [
                    'title' => 'Số điện thoại chống trùng',
                    'body' => 'Cùng một người nhắn ở Zalo và website vẫn gộp về một hồ sơ, vì khoá là số điện thoại.',
                ],
            ],
        ],
        'caps' => [
            'eyebrow' => 'Làm được thật',
            'title' => 'Những gì Yona làm được trên Zalo cá nhân',
            'note' => 'Danh sách này là năng lực đang chạy trong sản phẩm, không phải kế hoạch.',
            'items' => [
                'recall' => [
                    'title' => 'Thu hồi hai chiều',
                    'description' => 'Bạn thu hồi tin trong Yona thì tin trên Zalo cũng mất, và ngược lại.',
                ],
                'reaction' => [
                    'title' => 'Thả cảm xúc',
                    'description' => 'Cảm xúc khách thả hiện trong hộp thư, và bạn thả lại được từ Yona.',
                ],
                'group' => [
                    'title' => 'Tin nhóm hiện tên người gửi',
                    'description' => 'Nhóm nhiều người vẫn biết câu nào của ai, không phải đoán theo lượt.',
                ],
                'rich' => [
                    'title' => 'Vị trí, danh thiếp, thẻ ngân hàng',
                    'description' => 'Những thứ khách gửi kèm đều hiện đúng dạng, không thành một dòng chữ trống.',
                ],
            ],
        ],
        'risk' => [
            'eyebrow' => 'Nói trước',
            'title' => 'Zalo cá nhân không có API chính thức',
            'body' => 'Chúng tôi nói thẳng để bạn quyết định với đủ thông tin, thay vì tự phát hiện sau khi đã chuyển việc sang.',
            'points' => [
                'unofficial' => 'Kết nối đi qua đường không chính thức. Zalo có thể đổi cách hoạt động bất cứ lúc nào và kết nối sẽ gián đoạn.',
                'ban' => 'Tài khoản Zalo có thể bị hạn chế hoặc khóa. Rủi ro này có thật và không ai loại bỏ được nó.',
                'keep' => 'Tin nhắn đã về Yona thì nằm lại trong hộp thư và hồ sơ khách, kể cả khi kết nối dừng.',
                'oa' => 'Cần một kênh chính thức và ổn định lâu dài thì Zalo OA là đường đúng. Yona hiện chưa kết nối Zalo OA.',
            ],
        ],
        'closing' => [
            'title' => "Xem thử với tin\u{00A0}nhắn Zalo của bạn",
            'lead' => 'Một buổi 15 phút. Chúng tôi quét QR ngay trong buổi gọi để bạn thấy tin thật chạy về.',
            'cta_primary' => 'Đặt lịch demo',
            'cta_secondary' => 'Về trang chủ',
        ],
    ],
];
