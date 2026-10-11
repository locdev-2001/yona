<?php

// Trang pháp lý công khai (/dieu-khoan, /chinh-sach-rieng-tu) và nhãn cột Pháp lý
// ở footer. Mỗi câu mô tả cách Yona xử lý dữ liệu phải khớp với mã nguồn đang
// chạy: sửa hành vi phần mềm thì sửa câu tương ứng ở đây. Thông tin pháp nhân
// (tên, địa chỉ, mã số thuế, email) chưa có trong repo nên cố ý chưa ghi.

return [
    'nav' => [
        'heading' => 'Pháp lý',
        'terms' => 'Điều khoản sử dụng',
        'privacy' => 'Chính sách riêng tư',
    ],

    'eyebrow' => 'Pháp lý',
    'updated' => 'Cập nhật lần cuối: :date',
    'related' => 'Đọc cùng',

    'terms' => [
        'meta' => [
            'title' => 'Điều khoản sử dụng · Yona',
            'description' => 'Điều khoản khi dùng Yona: phạm vi dịch vụ trong giai đoạn chưa thu phí, rủi ro của kênh Zalo cá nhân, dữ liệu của bạn và quyền truy cập của đội Yona.',
        ],
        'title' => 'Điều khoản sử dụng',
        'updated_on' => '24/09/2026',
        'lead' => 'Điều khoản này áp dụng khi bạn tạo tài khoản và dùng Yona. Chúng tôi viết ngắn và nói thẳng những giới hạn đang có, để bạn quyết định với đủ thông tin.',
        'sections' => [
            'service' => [
                'heading' => '1. Yona là gì',
                'body' => [
                    'what' => 'Yona là phần mềm chạy trên web. Yona gom tin nhắn khách hàng từ nhiều kênh chat về một hộp thư dùng chung cho cả nhóm, và lưu người nhắn thành hồ sơ liên hệ.',
                    'channels' => 'Kênh dùng được là những kênh bấm chọn được khi tạo hộp thư mới, như Zalo cá nhân, khung chat trên website và email. Kênh chưa bấm chọn được hoặc còn ghi "Sắp có" thì chưa dùng được, và điều khoản này không hứa kênh đó.',
                ],
            ],
            'account' => [
                'heading' => '2. Tài khoản và thành viên',
                'points' => [
                    'owner' => 'Người tạo tài khoản là quản trị viên, có quyền mời thành viên, phân vai trò và kết nối kênh.',
                    'password' => 'Bạn giữ mật khẩu của mình và chịu trách nhiệm với thao tác thực hiện dưới tài khoản đó. Nên bật xác thực hai lớp trong phần Hồ sơ.',
                    'members' => 'Quản trị viên chịu trách nhiệm với những người mình mời vào tài khoản.',
                ],
            ],
            'free_phase' => [
                'heading' => '3. Giai đoạn chưa thu phí',
                'body' => [
                    'now' => 'Yona đang trong giai đoạn hoàn thiện. Hiện chưa có gói thu phí nào: không giới hạn số hội thoại, số kênh hay số thành viên, và không cần thẻ thanh toán.',
                ],
                'points' => [
                    'no_payment' => 'Yona chưa có chức năng thanh toán, nên không lưu thông tin thẻ hay tài khoản ngân hàng nào của bạn.',
                    'notice' => 'Khi có gói thu phí, chúng tôi báo trước cho quản trị viên của từng tài khoản.',
                    'changes' => 'Trong giai đoạn này tính năng có thể thay đổi, và dịch vụ có thể tạm gián đoạn trong lúc cập nhật.',
                ],
            ],
            'zalo' => [
                'heading' => '4. Kênh Zalo cá nhân và rủi ro đi kèm',
                'body' => [
                    'how' => 'Zalo không có API chính thức cho tài khoản cá nhân. Yona kết nối bằng cách đăng nhập tài khoản Zalo của bạn qua mã QR, dùng một thư viện mã nguồn mở không chính thức (zca-js).',
                ],
                'points' => [
                    'unofficial' => 'Zalo có thể đổi cách hoạt động bất cứ lúc nào. Khi đó kết nối gián đoạn cho tới khi Yona cập nhật theo.',
                    'ban' => 'Tài khoản Zalo có thể bị hạn chế hoặc khoá. Rủi ro này có thật, và cả bạn lẫn Yona đều không loại bỏ được nó.',
                    'tos' => 'Dùng công cụ không chính thức có thể trái với điều khoản sử dụng của Zalo. Bạn tự quyết định có kết nối tài khoản nào hay không.',
                    'session' => 'Phiên đăng nhập Zalo được lưu trên máy chủ của Yona để giữ kết nối. Cách lưu được nói rõ trong Chính sách riêng tư.',
                    'keep' => 'Tin nhắn đã về Yona vẫn nằm trong hộp thư và hồ sơ khách, kể cả khi kết nối dừng.',
                    'oa' => 'Cần một kênh chính thức và ổn định lâu dài thì Zalo OA là đường đúng. Yona hiện chưa kết nối Zalo OA.',
                ],
            ],
            'acceptable_use' => [
                'heading' => '5. Cách dùng được phép',
                'body' => [
                    'intro' => 'Bạn dùng Yona để trò chuyện với khách của chính mình. Bạn không được:',
                ],
                'points' => [
                    'spam' => 'gửi tin rác hoặc quảng cáo tới người chưa đồng ý nhận, hay dùng Yona trái quy định pháp luật về quảng cáo và chống tin nhắn rác;',
                    'personal_data' => 'thu thập hoặc dùng dữ liệu cá nhân của khách trái với pháp luật Việt Nam về bảo vệ dữ liệu cá nhân;',
                    'unlawful' => 'phát tán nội dung vi phạm pháp luật, nội dung lừa đảo hoặc mã độc qua tin nhắn và tệp đính kèm;',
                    'abuse' => 'tìm cách truy cập dữ liệu của tài khoản khác, hay làm quá tải hệ thống.',
                ],
                'note' => 'Bạn cũng phải tuân thủ điều khoản của từng nền tảng mình kết nối, như Zalo hay nhà cung cấp email.',
            ],
            'data' => [
                'heading' => '6. Dữ liệu của bạn',
                'points' => [
                    'ownership' => 'Tin nhắn, hồ sơ liên hệ và tệp bạn đưa vào Yona là của bạn. Yona xử lý chúng để vận hành dịch vụ cho bạn, theo Chính sách riêng tư.',
                    'export' => 'Bạn tự xuất danh sách liên hệ và các báo cáo ra tệp CSV ngay trong ứng dụng, bất cứ lúc nào.',
                    'not_yet' => 'Hiện chưa có chức năng tự xuất toàn bộ hội thoại hay tự xoá tài khoản. Cần một trong hai việc này thì nhắn cho chúng tôi theo mục Liên hệ.',
                ],
            ],
            'yona_access' => [
                'heading' => '7. Quyền truy cập của đội Yona',
                'body' => [
                    'what' => 'Đội vận hành Yona có tài khoản quản trị hệ thống. Tài khoản này xem được danh sách tài khoản và người dùng, và có chức năng đăng nhập dưới danh nghĩa một người dùng để hỗ trợ hoặc xử lý sự cố. Khi dùng chức năng đó, người của Yona thấy đúng những gì người dùng ấy thấy, gồm cả hội thoại.',
                    'when' => 'Chúng tôi chỉ dùng quyền này khi cần hỗ trợ bạn hoặc xử lý sự cố.',
                ],
            ],
            'termination' => [
                'heading' => '8. Tạm ngừng và chấm dứt',
                'points' => [
                    'by_you' => 'Bạn ngừng dùng Yona lúc nào cũng được: ngắt kết nối kênh, xoá hộp thư, xoá liên hệ ngay trong ứng dụng, và nhắn cho chúng tôi nếu muốn xoá cả tài khoản.',
                    'by_yona' => 'Yona có thể tạm khoá tài khoản dùng trái mục 5, và báo cho quản trị viên của tài khoản đó.',
                ],
            ],
            'liability' => [
                'heading' => '9. Giới hạn trách nhiệm',
                'points' => [
                    'as_is' => 'Trong giai đoạn hoàn thiện, Yona được cung cấp theo hiện trạng. Chúng tôi cố giữ dịch vụ ổn định nhưng chưa cam kết mức thời gian hoạt động.',
                    'platforms' => 'Yona không chịu trách nhiệm khi Zalo hay nền tảng bên thứ ba khác hạn chế, khoá tài khoản của bạn, hoặc thay đổi cách hoạt động.',
                    'law' => 'Điều khoản này được hiểu và áp dụng theo pháp luật Việt Nam.',
                ],
            ],
            'changes' => [
                'heading' => '10. Thay đổi điều khoản',
                'body' => [
                    'how' => 'Khi điều khoản thay đổi, chúng tôi cập nhật ngày ở đầu trang này. Thay đổi nào ảnh hưởng tới quyền của bạn thì chúng tôi báo trước cho quản trị viên các tài khoản.',
                ],
            ],
            'contact' => [
                'heading' => '11. Liên hệ',
                'body' => [
                    'how' => 'Nhắn cho chúng tôi qua khung chat ở góc dưới các trang của yona.vn, hoặc để lại số điện thoại ở trang Đặt lịch demo. Cả hai đều vào thẳng hộp thư của đội Yona.',
                ],
            ],
        ],
    ],

    'privacy' => [
        'meta' => [
            'title' => 'Chính sách riêng tư · Yona',
            'description' => 'Yona lưu dữ liệu gì, dùng để làm gì, ai xem được, bên thứ ba nào tham gia xử lý và bạn có quyền gì với dữ liệu của mình.',
        ],
        'title' => 'Chính sách riêng tư',
        'updated_on' => '11/10/2026',
        'lead' => 'Chính sách này nói Yona lưu dữ liệu gì, dùng để làm gì, ai xem được và bạn có quyền gì. Mỗi điều ở đây mô tả đúng cách phần mềm đang hoạt động hôm nay, kể cả những chỗ còn hạn chế.',
        'sections' => [
            'roles' => [
                'heading' => '1. Hai vai trò của Yona',
                'points' => [
                    'account' => 'Với dữ liệu tài khoản của bạn và của thành viên trong nhóm, như tên, email và mật khẩu, Yona quyết định cách xử lý và chịu trách nhiệm trực tiếp.',
                    'customers' => 'Với dữ liệu khách hàng bạn đưa vào Yona, như tin nhắn, hồ sơ liên hệ và tệp đính kèm, doanh nghiệp của bạn quyết định mục đích sử dụng. Yona xử lý thay cho bạn, chỉ để vận hành dịch vụ.',
                ],
                'note' => 'Nếu bạn là khách của một doanh nghiệp đang dùng Yona, hãy liên hệ doanh nghiệp đó trước. Chúng tôi hỗ trợ họ đáp ứng yêu cầu của bạn.',
            ],
            'collected' => [
                'heading' => '2. Dữ liệu Yona lưu',
                'points' => [
                    'account' => 'Tài khoản và thành viên: tên, email, ảnh đại diện, ngôn ngữ, mật khẩu (chỉ lưu dạng băm, không đọc ngược lại được), và mã xác thực hai lớp nếu bạn bật (lưu mã hoá).',
                    'sessions' => 'Phiên đăng nhập: địa chỉ IP và thông tin trình duyệt của từng phiên, để bạn xem và đăng xuất phiên từ xa trong phần Hồ sơ.',
                    'conversations' => 'Hội thoại: nội dung tin nhắn hai chiều, tệp đính kèm như ảnh, video, ghi âm, tài liệu, cùng ghi chú nội bộ, nhãn và người được giao.',
                    'contacts' => 'Hồ sơ liên hệ: tên, số điện thoại, email, ảnh đại diện, thuộc tính tuỳ biến và ghi chú do nhóm bạn nhập hoặc do kênh gửi về.',
                    'widget' => 'Khách nhắn qua khung chat trên website: loại và ngôn ngữ trình duyệt, cùng trang khách đang xem khi bắt đầu trò chuyện.',
                    'channels' => 'Thông tin kết nối kênh: phiên đăng nhập Zalo cá nhân (xem mục 5), mật khẩu hộp thư của kênh email, mã truy cập Google của hộp Gmail (xem mục 6) và mã truy cập các kênh khác. Mật khẩu email và mã truy cập được lưu mã hoá, trừ khoá API của kênh WhatsApp và SMS hiện còn lưu chưa mã hoá.',
                    'public' => 'Trang công khai của Yona: tên, số điện thoại và ghi chú bạn gửi ở trang Đặt lịch demo, và tin bạn nhắn qua khung chat trên yona.vn.',
                ],
            ],
            'purposes' => [
                'heading' => '3. Yona dùng dữ liệu để làm gì',
                'points' => [
                    'messaging' => 'Nhận và gửi tin nhắn qua các kênh bạn kết nối, hiển thị hộp thư và hồ sơ khách cho nhóm của bạn.',
                    'security' => 'Đăng nhập và giữ an toàn tài khoản.',
                    'email' => 'Gửi email hệ thống: xác nhận đăng ký, đặt lại mật khẩu và các thông báo bạn đã bật.',
                    'support' => 'Hỗ trợ khi bạn yêu cầu và xử lý sự cố.',
                    'demo' => 'Gọi lại khi bạn đặt lịch demo.',
                    'analytics' => 'Đếm lượt xem trang ở dạng tổng hợp bằng Plausible, công cụ thống kê không dùng cookie.',
                ],
            ],
            'access' => [
                'heading' => '4. Ai xem được dữ liệu',
                'points' => [
                    'members' => 'Thành viên trong tài khoản của bạn, theo vai trò và hộp thư được phân.',
                    'isolation' => 'Dữ liệu của mỗi doanh nghiệp tách riêng theo tài khoản. Thành viên của tài khoản này không xem được dữ liệu của tài khoản khác.',
                    'yona' => 'Đội vận hành Yona: có quyền quản trị hệ thống và chức năng đăng nhập dưới danh nghĩa một người dùng để hỗ trợ hoặc xử lý sự cố. Khi đó họ thấy đúng những gì người dùng ấy thấy.',
                    'files' => 'Tệp đính kèm mở được qua đường dẫn chứa chuỗi ngẫu nhiên, không cần đăng nhập. Ai có đường dẫn thì mở được tệp, nên đừng chia sẻ đường dẫn tệp ra ngoài nhóm.',
                ],
            ],
            'zalo_session' => [
                'heading' => '5. Phiên đăng nhập Zalo cá nhân',
                'points' => [
                    'stored' => 'Khi bạn quét QR, Yona lưu phiên đăng nhập Zalo (cookie của phiên) thành một tệp trên máy chủ để giữ kết nối. Ai có tệp này là dùng được tài khoản Zalo đó.',
                    'protection' => 'Tệp chỉ tiến trình dịch vụ Zalo của Yona đọc được (quyền 0600 trong thư mục 0700). Tệp hiện chưa được mã hoá khi lưu trên đĩa.',
                    'removal' => 'Khi bạn ngắt kết nối Zalo trong cài đặt hộp thư, tệp phiên bị xoá.',
                    'transport' => 'Tin nhắn Zalo đi qua thư viện mã nguồn mở không chính thức zca-js tới máy chủ của Zalo.',
                ],
            ],
            'google_data' => [
                'heading' => '6. Dữ liệu từ tài khoản Google (Gmail)',
                'body' => [
                    'intro' => 'Khi bạn chọn Đăng nhập Google để kết nối hộp thư Gmail hoặc Google Workspace, Yona xin quyền truy cập Gmail (phạm vi https://mail.google.com/) cùng địa chỉ email của tài khoản đó. Mục này nói rõ Yona làm gì với dữ liệu Google.',
                ],
                'points' => [
                    'accessed' => 'Dữ liệu Yona truy cập: thư trong hộp thư đến (người gửi, người nhận, tiêu đề, nội dung, tệp đính kèm) và địa chỉ email của tài khoản Google bạn kết nối. Yona đọc thư qua IMAP và gửi thư qua SMTP của Gmail bằng mã truy cập do Google cấp.',
                    'use' => 'Mục đích duy nhất: đưa thư của khách vào hộp thư chung của nhóm bạn trên Yona, và gửi thư trả lời hoặc thư mới do nhóm bạn soạn từ chính địa chỉ của bạn. Yona không xoá và không di chuyển thư trong Gmail; khi Yona tải thư về, Gmail đánh dấu thư đó là đã đọc.',
                    'notifications' => 'Để thư mới hiện gần như ngay lập tức, Yona đăng ký nhận thông báo "có thư mới" của Gmail qua Google Cloud Pub/Sub. Thông báo chỉ chứa địa chỉ email và một mã thứ tự, không chứa nội dung thư.',
                    'storage' => 'Mã truy cập và mã làm mới của Google được lưu mã hoá. Thư đã đồng bộ được lưu trên máy chủ của Yona như mọi hội thoại khác (mục 2).',
                    'sharing' => 'Yona không bán dữ liệu Gmail, không dùng để quảng cáo và không chuyển cho bên thứ ba, trừ khi bạn tự bật một công cụ nhận dữ liệu hội thoại (webhook, agent bot, tích hợp ở mục 7), khi cần để vận hành tính năng bạn đang dùng, hoặc khi pháp luật yêu cầu.',
                    'ai' => 'Yona không dùng dữ liệu Gmail để huấn luyện hay cải thiện mô hình trí tuệ nhân tạo hoặc máy học dùng chung.',
                    'people' => 'Đội vận hành Yona không đọc thư Gmail của bạn, trừ khi bạn yêu cầu hỗ trợ cho một việc cụ thể, khi cần điều tra sự cố bảo mật hoặc lạm dụng, hoặc khi pháp luật yêu cầu.',
                    'disconnect' => 'Ngắt kết nối: xoá hộp thư Gmail trong phần cài đặt Hộp thư thì Yona xoá mã truy cập, dừng nhận thông báo từ Gmail và xoá các hội thoại của hộp thư đó cùng tệp đính kèm. Bạn cũng thu hồi quyền của Yona bất cứ lúc nào tại https://myaccount.google.com/permissions.',
                    'limited_use' => 'Yona sử dụng và chuyển giao thông tin nhận được từ Google API theo đúng Chính sách dữ liệu người dùng của Google API Services (https://developers.google.com/terms/api-services-user-data-policy), bao gồm các yêu cầu về Giới hạn sử dụng (Limited Use).',
                ],
            ],
            'third_parties' => [
                'heading' => '7. Bên thứ ba tham gia xử lý',
                'points' => [
                    'zalo' => 'Zalo: nhận và gửi tin nhắn của kênh Zalo cá nhân.',
                    'other_channels' => 'Nền tảng nhắn tin khác bạn kết nối, như Telegram, LINE, WhatsApp hay nhà cung cấp SMS: nhận và gửi tin nhắn của kênh đó.',
                    'cloudflare' => 'Cloudflare: mọi truy cập tới yona.vn đi qua mạng phân phối của Cloudflare. Máy chủ của Cloudflare có thể đặt ngoài Việt Nam.',
                    'mail' => 'Nhà cung cấp dịch vụ gửi email: chuyển email hệ thống tới hộp thư của bạn.',
                    'your_mailbox' => 'Máy chủ email của chính bạn: khi bạn kết nối kênh email, Yona đọc và gửi thư qua IMAP/SMTP bằng tài khoản bạn cung cấp.',
                    'google' => 'Google: hộp Gmail kết nối bằng Đăng nhập Google được đọc và gửi qua máy chủ Gmail, thông báo thư mới đi qua Google Cloud Pub/Sub (xem mục 6).',
                    'plausible' => 'Plausible: đếm lượt xem trang, không dùng cookie.',
                    'push' => 'Dịch vụ thông báo đẩy của trình duyệt: chỉ khi bạn bật thông báo đẩy, nội dung thông báo đi qua dịch vụ đẩy của trình duyệt bạn đang dùng.',
                    'your_tools' => 'Công cụ bạn tự nối vào: webhook, agent bot và các tích hợp bạn bật nhận dữ liệu hội thoại theo đúng cấu hình của bạn. Bạn chịu trách nhiệm với nơi nhận đó.',
                ],
            ],
            'retention' => [
                'heading' => '8. Lưu trữ và xoá',
                'points' => [
                    'kept' => 'Tin nhắn, hồ sơ liên hệ và tệp được giữ cho tới khi bạn xoá chúng hoặc yêu cầu xoá tài khoản. Hiện Yona chưa tự xoá hội thoại theo thời hạn.',
                    'notifications' => 'Thông báo trong ứng dụng cũ hơn một tháng được tự động dọn.',
                    'self_service' => 'Bạn tự xoá liên hệ, tin nhắn và hộp thư ngay trong ứng dụng.',
                    'account' => 'Chưa có nút tự xoá tài khoản. Nhắn cho chúng tôi theo mục Liên hệ, đội vận hành sẽ xoá tài khoản cùng dữ liệu đi kèm từ trang quản trị hệ thống.',
                ],
            ],
            'security' => [
                'heading' => '9. Bảo mật',
                'points' => [
                    'https' => 'Kết nối tới Yona dùng HTTPS.',
                    'passwords' => 'Mật khẩu lưu dạng băm. Bạn bật được xác thực hai lớp.',
                    'secrets' => 'Mật khẩu hộp thư email, mã truy cập Google và mã truy cập kênh lưu mã hoá, trừ khoá API của kênh WhatsApp và SMS (hiện chưa mã hoá).',
                    'zalo' => 'Phiên Zalo lưu dạng tệp chưa mã hoá, chỉ giới hạn quyền đọc (xem mục 5).',
                    'incident' => 'Không hệ thống nào an toàn tuyệt đối. Nếu phát hiện sự cố làm lộ dữ liệu, chúng tôi báo cho quản trị viên các tài khoản bị ảnh hưởng.',
                ],
            ],
            'rights' => [
                'heading' => '10. Quyền của bạn',
                'body' => [
                    'intro' => 'Theo pháp luật Việt Nam về bảo vệ dữ liệu cá nhân, bạn có quyền:',
                ],
                'points' => [
                    'know' => 'được biết dữ liệu nào đang được xử lý và vì sao, chính là nội dung trang này;',
                    'access' => 'xem và sửa thông tin của mình trong phần Hồ sơ;',
                    'portability' => 'lấy dữ liệu ra: xuất danh sách liên hệ ra CSV ngay trong ứng dụng, dữ liệu khác thì yêu cầu qua mục Liên hệ;',
                    'delete' => 'yêu cầu xoá dữ liệu, hạn chế hoặc phản đối việc xử lý;',
                    'withdraw' => 'rút lại sự đồng ý bằng cách ngừng dùng và yêu cầu xoá tài khoản;',
                    'complain' => 'khiếu nại với chúng tôi hoặc với cơ quan nhà nước có thẩm quyền.',
                ],
                'note' => 'Chúng tôi trả lời yêu cầu qua đúng kênh bạn đã gửi.',
            ],
            'cookies' => [
                'heading' => '11. Cookie',
                'points' => [
                    'session' => 'Cookie phiên đăng nhập và cookie chống giả mạo yêu cầu: bắt buộc để đăng nhập.',
                    'locale' => 'Cookie ngôn ngữ: nhớ ngôn ngữ bạn đã chọn.',
                    'widget' => 'Khung chat trên yona.vn lưu mã cuộc trò chuyện trong trình duyệt, để lần sau bạn quay lại vẫn thấy tin cũ.',
                    'no_ads' => 'Yona không dùng cookie quảng cáo hay cookie theo dõi.',
                ],
            ],
            'changes' => [
                'heading' => '12. Thay đổi chính sách',
                'body' => [
                    'how' => 'Khi chính sách thay đổi, chúng tôi cập nhật ngày ở đầu trang này. Thay đổi nào ảnh hưởng tới quyền của bạn thì chúng tôi báo trước cho quản trị viên các tài khoản.',
                ],
            ],
            'contact' => [
                'heading' => '13. Liên hệ',
                'body' => [
                    'how' => 'Nhắn cho chúng tôi qua khung chat ở góc dưới các trang của yona.vn, hoặc để lại số điện thoại ở trang Đặt lịch demo. Cả hai đều vào thẳng hộp thư của đội Yona.',
                ],
            ],
        ],
    ],
];
