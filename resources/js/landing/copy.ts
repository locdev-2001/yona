// Chữ hiển thị của bề mặt công khai, theo từng ngôn ngữ. Thẻ meta (tiêu đề tab,
// mô tả, JSON-LD) không nằm ở đây mà ở lang/{locale}/landing.php, máy chủ in sẵn
// vào HTML; đường dẫn, thương hiệu, nhãn pháp lý và danh sách ngôn ngữ cũng do máy
// chủ đẩy xuống qua `landingConfig`.

interface Card {
    title: string;
    body: string;
}

export interface FeatureCopy {
    eyebrow: string;
    /** Tiêu đề tách hai dòng: xuống dòng là quyết định bố cục, không để trình duyệt tự ngắt. */
    title_a: string;
    title_b: string;
    body: string;
    cards: Card[];
}

export interface LandingCopy {
    nav: {
        features: string;
        how: string;
        login: string;
        register: string;
        open_app: string;
        language: string;
        menu: string;
    };
    hero: { title_lead: string; title_focus: string; title_tail: string; subtitle: string; fine: string };
    features: { platform: FeatureCopy; inbox: FeatureCopy; conversation: FeatureCopy };
    story: { eyebrow: string; title: string; body: string; meaning: string };
    questions: { title: string; items: Card[] };
    flow: { eyebrow: string; title: string; subtitle: string; steps: Card[] };
    rules: { eyebrow: string; title: string; items: Card[] };
    closing: { title: string };
    footer: { tagline: string; copyright: string; product: string; account: string; language: string; note: string };
}

const VI: LandingCopy = {
    "nav": {
        "features": "Nền tảng",
        "how": "Cách bắt đầu",
        "login": "Đăng nhập",
        "register": "Tạo tài khoản",
        "open_app": "Mở Yona",
        "language": "Ngôn ngữ",
        "menu": "Menu"
    },
    "hero": {
        "title_lead": "Nhiều nền tảng.",
        "title_focus": "Một nơi giao tiếp.",
        "title_tail": "",
        "subtitle": "Yona là nền tảng hợp nhất giao tiếp, kết nối những cuộc trò chuyện đang nằm rải rác giữa các ứng dụng. Đọc, trả lời và tìm lại nội dung trong một không gian chung, ngay trên trình duyệt.",
        "fine": "Bắt đầu bằng email hoặc tài khoản Google."
    },
    "features": {
        "platform": {
            "eyebrow": "Nền tảng hợp nhất giao tiếp",
            "title_a": "Kết nối các nền tảng,",
            "title_b": "giữ liền mạch cuộc trò chuyện",
            "body": "Một lời nhắn ở ứng dụng này, một cuộc trao đổi ở ứng dụng khác. Yona đưa các cuộc trò chuyện từ những nền tảng đã kết nối vào cùng một nơi, để bạn tiếp tục giao tiếp mà ít phải chuyển qua lại.",
            "cards": [
                {
                    "title": "Theo dõi tập trung",
                    "body": "Đọc tin nhắn và email trong cùng danh sách hội thoại. Nguồn kết nối luôn hiển thị rõ để bạn biết mỗi cuộc trao đổi đến từ đâu."
                },
                {
                    "title": "Trả lời đúng nơi",
                    "body": "Soạn câu trả lời trong Yona và gửi qua kết nối tương ứng. Người bên kia tiếp tục nhận tin trên nền tảng họ đang dùng."
                },
                {
                    "title": "Tìm lại dễ dàng",
                    "body": "Dùng tìm kiếm, bộ lọc và nhãn để tìm lại nội dung đã về Yona, thay vì nhớ xem cuộc trò chuyện nằm ở ứng dụng nào."
                }
            ]
        },
        "inbox": {
            "eyebrow": "Các kết nối hiện có",
            "title_a": "Bắt đầu từ những kết nối",
            "title_b": "bạn đang sử dụng",
            "body": "Yona hướng đến việc mang các nền tảng giao tiếp về một nơi. Bạn có thể bắt đầu với những kết nối dưới đây; tính năng và phạm vi đồng bộ phụ thuộc từng nền tảng.",
            "cards": [
                {
                    "title": "Trò chuyện trên Yona",
                    "body": "Tìm nhau bằng @username và nhắn trực tiếp trên Yona. Cuộc trò chuyện với bạn bè xuất hiện cạnh các kết nối khác trong cùng không gian."
                },
                {
                    "title": "Kết nối Zalo cá nhân",
                    "body": "Đăng nhập bằng mã QR để đọc và trả lời tin Zalo từ Yona. Đây là kết nối không chính thức; Zalo có thể ngắt kết nối hoặc hạn chế tài khoản."
                },
                {
                    "title": "Kết nối Gmail",
                    "body": "Kết nối tài khoản Google để đọc và trả lời email trong Yona, cùng nơi bạn theo dõi những cuộc trò chuyện khác."
                }
            ]
        },
        "conversation": {
            "eyebrow": "Một trải nghiệm xuyên các kết nối",
            "title_a": "Tiếp tục cuộc trò chuyện,",
            "title_b": "giữ nguyên ngữ cảnh",
            "body": "Sự thống nhất cần hiện diện trong từng thao tác. Yona mang cách đọc, tìm kiếm và tổ chức hội thoại về cùng một trải nghiệm; mỗi kết nối vẫn giữ những khả năng riêng.",
            "cards": [
                {
                    "title": "Trao đổi tự nhiên",
                    "body": "Trả lời trích dẫn, thả cảm xúc hoặc thu hồi tin nhắn khi kết nối hỗ trợ. Các thao tác quen thuộc nằm ngay trong cuộc trò chuyện."
                },
                {
                    "title": "Chia sẻ ngay trong hội thoại",
                    "body": "Gửi ảnh, tệp và sticker theo khả năng của từng kết nối. Với thẻ VietQR, bạn có thể chia sẻ thông tin chuyển khoản khi cần."
                },
                {
                    "title": "Sắp xếp theo cách của bạn",
                    "body": "Gắn nhãn, thêm ghi chú riêng và lưu câu trả lời thường dùng. Tổ chức các cuộc trao đổi theo nhu cầu của bạn trong một nơi thống nhất."
                }
            ]
        }
    },
    "story": {
        "eyebrow": "Vì sao là Yona?",
        "title": "Từ phân mảnh đến hợp nhất.",
        "body": "Tên Yona lấy cảm hứng từ bổ đề Yoneda trong lý thuyết phạm trù. Một cách diễn giải trực giác là hiểu một đối tượng thông qua các mối liên hệ của nó.",
        "meaning": "Với Yona, cảm hứng ấy trở thành một hướng đi: kết nối những nền tảng đang tách rời để giao tiếp được liền mạch hơn. Các kết nối giữ bản sắc riêng và cùng tham gia một trải nghiệm thống nhất."
    },
    "flow": {
        "eyebrow": "Bắt đầu với Yona",
        "title": "Kết nối từng nền tảng. Tiếp tục mọi cuộc trò chuyện.",
        "subtitle": "Mở Yona trên trình duyệt máy tính hoặc điện thoại. Chọn những kết nối phù hợp để xây dựng không gian giao tiếp của bạn.",
        "steps": [
            {
                "title": "Tạo tài khoản",
                "body": "Đăng ký bằng email hoặc tài khoản Google để bắt đầu sử dụng Yona."
            },
            {
                "title": "Chọn @username",
                "body": "Đặt tên để người khác tìm thấy và kết nối trực tiếp với bạn trên Yona."
            },
            {
                "title": "Thêm kết nối",
                "body": "Chọn nền tảng được hỗ trợ và làm theo hướng dẫn kết nối trong ứng dụng."
            },
            {
                "title": "Tiếp tục giao tiếp",
                "body": "Đọc, trả lời và tìm lại các cuộc trò chuyện trong cùng một không gian."
            }
        ]
    },
    "rules": {
        "eyebrow": "Thông tin sử dụng",
        "title": "Hiểu rõ các kết nối và dữ liệu của bạn",
        "items": [
            {
                "title": "Không gian cá nhân",
                "body": "Mỗi tài khoản có một không gian giao tiếp riêng. Bạn chủ động chọn các nền tảng muốn kết nối và cách tổ chức hội thoại."
            },
            {
                "title": "Khả năng từng kết nối",
                "body": "Định dạng tin nhắn, cách đăng nhập và phạm vi đồng bộ phụ thuộc nền tảng. Kết nối không chính thức như Zalo cá nhân có thể gián đoạn."
            },
            {
                "title": "Lưu trữ tin nhắn",
                "body": "Yona lưu tin nhắn trên máy chủ để bạn truy cập từ nhiều thiết bị. Dịch vụ hiện không có mã hóa đầu cuối."
            },
            {
                "title": "Truy cập linh hoạt",
                "body": "Sử dụng Yona trên trình duyệt hoặc thêm vào màn hình chính. Khả năng nhận thông báo phụ thuộc trình duyệt và quyền bạn cho phép."
            }
        ]
    },
    "questions": {
        "title": "Tìm hiểu thêm về Yona",
        "items": [
            {
                "title": "Yona là gì?",
                "body": "Yona là nền tảng hợp nhất giao tiếp. Các cuộc trò chuyện từ những nền tảng đã kết nối xuất hiện trong một không gian chung, giúp bạn đọc, trả lời, tìm kiếm và tổ chức nội dung ở một nơi."
            },
            {
                "title": "Yona có thay thế các ứng dụng đang dùng không?",
                "body": "Bạn kết nối nền tảng đang sử dụng với Yona. Người ở phía bên kia vẫn trò chuyện trên ứng dụng của họ; câu trả lời từ Yona đi qua kết nối tương ứng."
            },
            {
                "title": "Yona đã kết nối được mọi nền tảng chưa?",
                "body": "Chưa. Hợp nhất các nền tảng giao tiếp là mục tiêu của Yona. Hiện bạn có thể bắt đầu với Zalo cá nhân, Gmail và trò chuyện trực tiếp trên Yona. Chỉ các kết nối khả dụng trong ứng dụng mới sử dụng được."
            },
            {
                "title": "Có cần tải ứng dụng để sử dụng Yona không?",
                "body": "Bạn có thể sử dụng Yona ngay trên trình duyệt máy tính hoặc điện thoại. Thêm Yona vào màn hình chính nếu trình duyệt hỗ trợ để mở nhanh như một ứng dụng."
            }
        ]
    },
    "closing": {
        "title": "Kết nối các nền tảng. Hợp nhất giao tiếp."
    },
    "footer": {
        "tagline": "Nền tảng hợp nhất giao tiếp. Kết nối các nền tảng, tiếp tục những cuộc trò chuyện trong một không gian chung.",
        "copyright": "© :year Yona. Bảo lưu mọi quyền.",
        "product": "Nền tảng",
        "account": "Tài khoản",
        "language": "Ngôn ngữ",
        "note": "Phát triển tại Việt Nam."
    }
};

const EN: LandingCopy = {
    "nav": {
        "features": "Platform",
        "how": "Get started",
        "login": "Log in",
        "register": "Sign up",
        "open_app": "Open Yona",
        "language": "Language",
        "menu": "Menu"
    },
    "hero": {
        "title_lead": "Many platforms.",
        "title_focus": "One place to communicate.",
        "title_tail": "",
        "subtitle": "Yona is a unified communication platform that connects conversations scattered across apps. Read, reply and find what you need in one shared space, right in your browser.",
        "fine": "Get started with email or your Google account."
    },
    "features": {
        "platform": {
            "eyebrow": "A unified communication platform",
            "title_a": "Connect your platforms.",
            "title_b": "Keep conversations connected.",
            "body": "A message in one app, an exchange in another. Yona brings conversations from your connected platforms into one place, so you can keep communicating with less switching between apps.",
            "cards": [
                {
                    "title": "Follow conversations together",
                    "body": "Read messages and email in one conversation list. Each exchange keeps its source visible, so you know where it came from."
                },
                {
                    "title": "Reply through the right connection",
                    "body": "Write your reply in Yona and send it through the corresponding connection. The other person receives it on the platform they already use."
                },
                {
                    "title": "Find what you need",
                    "body": "Use search, filters and labels to find content received in Yona, instead of remembering which app a conversation was in."
                }
            ]
        },
        "inbox": {
            "eyebrow": "Available connections",
            "title_a": "Start with the connections",
            "title_b": "you already use",
            "body": "Yona aims to bring communication platforms into one place. Start with the connections below; features and synchronization depend on each platform.",
            "cards": [
                {
                    "title": "Conversations on Yona",
                    "body": "Find people by @username and message them directly on Yona. Conversations with friends sit alongside your other connections in the same space."
                },
                {
                    "title": "Connect personal Zalo",
                    "body": "Sign in with a QR code to read and reply to Zalo messages from Yona. This is an unofficial connection; Zalo may disconnect or restrict your account."
                },
                {
                    "title": "Connect Gmail",
                    "body": "Connect your Google account to read and reply to email in Yona, in the same place as your other conversations."
                }
            ]
        },
        "conversation": {
            "eyebrow": "A consistent experience across connections",
            "title_a": "Continue the conversation.",
            "title_b": "Keep the context.",
            "body": "A unified experience takes shape in everyday actions. Yona brings reading, searching and organizing conversations together, while each connection retains its own capabilities.",
            "cards": [
                {
                    "title": "Communicate naturally",
                    "body": "Quote a message, add a reaction or unsend when the connection supports it. Familiar actions stay close to the conversation."
                },
                {
                    "title": "Share within the conversation",
                    "body": "Send photos, files and stickers where supported. Share bank transfer details with a VietQR card when you need to."
                },
                {
                    "title": "Organize your way",
                    "body": "Apply labels, add private notes and save frequently used replies. Arrange conversations around your needs in one consistent space."
                }
            ]
        }
    },
    "story": {
        "eyebrow": "Why Yona?",
        "title": "From fragmentation to unity.",
        "body": "The name Yona takes inspiration from the Yoneda lemma in category theory. One intuitive interpretation is to understand an object through its relationships.",
        "meaning": "For Yona, that inspiration becomes a direction: connect platforms that sit apart so communication can flow more naturally. Each connection retains its identity while contributing to one unified experience."
    },
    "flow": {
        "eyebrow": "Get started with Yona",
        "title": "Connect your platforms. Continue your conversations.",
        "subtitle": "Open Yona in a browser on your computer or phone. Choose the available connections that fit the way you communicate.",
        "steps": [
            {
                "title": "Create an account",
                "body": "Sign up with email or your Google account to start using Yona."
            },
            {
                "title": "Choose an @username",
                "body": "Pick the name people use to find and connect with you directly on Yona."
            },
            {
                "title": "Add a connection",
                "body": "Choose a supported platform and follow the connection instructions in the app."
            },
            {
                "title": "Keep communicating",
                "body": "Read, reply and find your conversations in the same space."
            }
        ]
    },
    "rules": {
        "eyebrow": "Using Yona",
        "title": "Understand your connections and data",
        "items": [
            {
                "title": "Your personal space",
                "body": "Each account has its own communication space. Choose the platforms you want to connect and how to organize your conversations."
            },
            {
                "title": "Connection capabilities",
                "body": "Message formats, sign-in methods and synchronization vary by platform. Unofficial connections, including personal Zalo, may be interrupted."
            },
            {
                "title": "Message storage",
                "body": "Yona stores messages on its servers so you can access them across devices. The service does not currently provide end-to-end encryption."
            },
            {
                "title": "Flexible access",
                "body": "Use Yona in a browser or add it to your home screen. Notifications depend on your browser and the permissions you grant."
            }
        ]
    },
    "questions": {
        "title": "More about Yona",
        "items": [
            {
                "title": "What is Yona?",
                "body": "Yona is a unified communication platform. Conversations from connected platforms appear in one space, where you can read, reply, search and organize content."
            },
            {
                "title": "Does Yona replace the apps I use?",
                "body": "You connect your existing platforms to Yona. People on the other side continue using their own apps; replies from Yona go through the corresponding connection."
            },
            {
                "title": "Does Yona support every platform already?",
                "body": "Not yet. Bringing communication platforms together is Yona’s goal. You can currently start with personal Zalo, Gmail and direct conversations on Yona. Only connections available in the app can be used."
            },
            {
                "title": "Do I need to download an app?",
                "body": "Use Yona directly in a browser on your computer or phone. If your browser supports it, add Yona to your home screen for quick access."
            }
        ]
    },
    "closing": {
        "title": "Connect your platforms. Unify your communication."
    },
    "footer": {
        "tagline": "A unified communication platform. Connect your platforms and continue conversations in one shared space.",
        "copyright": "© :year Yona. All rights reserved.",
        "product": "Platform",
        "account": "Account",
        "language": "Language",
        "note": "Built in Vietnam."
    }
};

const COPY_BY_LOCALE: Record<string, LandingCopy> = { vi: VI, en: EN };

/** Ngôn ngữ chưa có bản dịch thì rơi về tiếng Việt, thị trường chính. */
export function landingCopy(locale: string): LandingCopy {
    return COPY_BY_LOCALE[locale] ?? VI;
}
