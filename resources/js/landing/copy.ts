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
    features: { inbox: FeatureCopy; conversation: FeatureCopy };
    flow: { eyebrow: string; title: string; subtitle: string; steps: Card[] };
    rules: { eyebrow: string; title: string; items: Card[] };
    closing: { title: string };
    footer: { tagline: string; copyright: string; product: string; account: string; language: string; note: string };
}

const VI: LandingCopy = {
    nav: {
        features: 'Tính năng',
        how: 'Cách bắt đầu',
        login: 'Đăng nhập',
        register: 'Tạo tài khoản',
        open_app: 'Mở Yona',
        language: 'Ngôn ngữ',
        menu: 'Menu',
    },
    hero: {
        title_lead: 'Zalo, email và bạn bè',
        title_focus: 'chung một hộp thư',
        title_tail: 'của riêng bạn',
        subtitle:
            'Đăng ký là có ngay một hộp thư riêng và một @username. Kết nối Zalo cá nhân và Gmail để tin nhắn về một chỗ, rồi nhắn với bạn bè trên Yona ngay trong hộp thư đó.',
        fine: 'Đăng ký bằng email hoặc tài khoản Google.',
    },
    features: {
        inbox: {
            eyebrow: 'Một hộp thư cho mọi tin',
            title_a: 'Không phải mở từng ứng dụng,',
            title_b: 'mọi tin nhắn nằm một chỗ',
            body: 'Tin Zalo, thư Gmail và tin từ bạn bè trên Yona xếp chung một danh sách. Mỗi cuộc trò chuyện ghi rõ đến từ kênh nào, trả lời là đi đúng về kênh đó.',
            cards: [
                {
                    title: 'Zalo cá nhân',
                    body: 'Quét mã QR như khi mở Zalo trên máy tính. Tin nhắn Zalo về hộp thư, trả lời từ Yona thì người kia nhận trên Zalo.',
                },
                {
                    title: 'Gmail và email',
                    body: 'Kết nối Gmail để thư về hộp thư Yona. Đọc và trả lời thư ngay cạnh tin nhắn Zalo.',
                },
                {
                    title: 'Bạn bè trên Yona',
                    body: 'Mỗi người có một @username. Gõ tên là tìm thấy và nhắn được ngay, không cần trao số điện thoại.',
                },
            ],
        },
        conversation: {
            eyebrow: 'Trò chuyện đầy đủ',
            title_a: 'Trả lời, thả cảm xúc,',
            title_b: 'gửi ảnh hay sticker',
            body: 'Những thứ bạn quen dùng khi nhắn tin đều có, cộng thêm vài thứ giúp hộp thư gọn gàng. Kênh nào hỗ trợ thì làm được ngay trong Yona.',
            cards: [
                {
                    title: 'Trả lời, cảm xúc, thu hồi',
                    body: 'Trích đúng tin muốn trả lời, thả cảm xúc lên tin, thu hồi tin lỡ gửi nhầm.',
                },
                {
                    title: 'Ảnh, file, sticker, chuyển khoản',
                    body: 'Gửi ảnh, file và sticker trong cuộc trò chuyện. Cần nhận tiền thì gửi thẻ chuyển khoản có mã VietQR để người kia quét.',
                },
                {
                    title: 'Nhãn, ghi chú, câu trả lời mẫu',
                    body: 'Gắn nhãn, ghi chú riêng chỉ mình thấy, lưu câu trả lời hay dùng. Ô tìm kiếm giúp lục lại tin cũ nhanh.',
                },
            ],
        },
    },
    flow: {
        eyebrow: 'Cách bắt đầu',
        title: 'Bốn bước để gom tin nhắn về một chỗ',
        subtitle: 'Không phải tải gì về. Mở trình duyệt trên máy tính hoặc điện thoại là dùng được.',
        steps: [
            { title: 'Đăng ký', body: 'Bằng email hoặc tài khoản Google. Hộp thư của bạn có ngay.' },
            { title: 'Chọn @username', body: 'Cái tên để bạn bè trên Yona tìm thấy bạn.' },
            { title: 'Kết nối Zalo, Gmail', body: 'Quét mã QR cho Zalo cá nhân, đăng nhập Google cho Gmail.' },
            { title: 'Nhắn tin', body: 'Trả lời tin Zalo và thư, hoặc gõ @username để nhắn bạn bè.' },
        ],
    },
    rules: {
        eyebrow: 'Riêng tư và an toàn',
        title: 'Hộp thư của bạn, nói thật những gì nên biết',
        items: [
            {
                title: 'Chỉ bạn vào được',
                body: 'Mỗi tài khoản có một hộp thư riêng. Không ai khác được thêm vào hộp thư đó để đọc tin của bạn.',
            },
            {
                title: 'Nói trước về Zalo',
                body: 'Zalo cá nhân kết nối qua mã QR, không phải cổng chính thức của Zalo. Zalo có thể hạn chế tài khoản hoặc ngắt kết nối, nên hãy cân nhắc trước khi dùng.',
            },
            {
                title: 'Tin lưu trên máy chủ',
                body: 'Tin nhắn được lưu trên máy chủ Yona để bạn đọc được trên mọi thiết bị. Yona không mã hoá đầu cuối, đừng gửi mật khẩu hay mã OTP qua đây.',
            },
            {
                title: 'Như ứng dụng trên điện thoại',
                body: 'Cài Yona lên màn hình chính từ trình duyệt và nhận thông báo khi có tin mới.',
            },
        ],
    },
    closing: { title: 'Gom tin nhắn về một chỗ' },
    footer: {
        tagline: 'Hộp thư cá nhân cho Zalo, email và bạn bè, chạy ngay trên trình duyệt.',
        copyright: '© :year Yona. Đã đăng ký bản quyền.',
        product: 'Sản phẩm',
        account: 'Tài khoản',
        language: 'Ngôn ngữ',
        note: 'Làm tại Việt Nam.',
    },
};

const EN: LandingCopy = {
    nav: {
        features: 'Features',
        how: 'Get started',
        login: 'Log in',
        register: 'Sign up',
        open_app: 'Open Yona',
        language: 'Language',
        menu: 'Menu',
    },
    hero: {
        title_lead: 'Zalo, email and friends',
        title_focus: 'in one inbox',
        title_tail: 'that is yours alone',
        subtitle:
            'Sign up and you get your own inbox and an @username right away. Connect personal Zalo and Gmail so every message lands in one place, then chat with friends on Yona from that same inbox.',
        fine: 'Sign up with email or your Google account.',
    },
    features: {
        inbox: {
            eyebrow: 'One inbox for everything',
            title_a: 'No more hopping between apps,',
            title_b: 'every message in one place',
            body: 'Zalo messages, Gmail and chats with friends on Yona share one list. Each conversation shows where it came from, and your reply goes back the same way.',
            cards: [
                {
                    title: 'Personal Zalo',
                    body: 'Scan a QR code, just like opening Zalo on a computer. Zalo messages land in your inbox, and replies from Yona arrive on Zalo.',
                },
                {
                    title: 'Gmail and email',
                    body: 'Connect Gmail and your mail shows up in Yona. Read and reply next to your Zalo messages.',
                },
                {
                    title: 'Friends on Yona',
                    body: 'Everyone has an @username. Type it to find someone and message them right away, no phone numbers to swap.',
                },
            ],
        },
        conversation: {
            eyebrow: 'Full conversations',
            title_a: 'Reply, react,',
            title_b: 'send a photo or a sticker',
            body: 'Everything you expect from a messaging app, plus a few things that keep your inbox tidy. Whatever a channel supports works right inside Yona.',
            cards: [
                {
                    title: 'Replies, reactions, unsend',
                    body: 'Quote the exact message you are answering, react to messages, take back a message sent by mistake.',
                },
                {
                    title: 'Photos, files, stickers, transfers',
                    body: 'Share photos, files and stickers in the chat. Need to get paid back? Send a bank transfer card with a VietQR code to scan.',
                },
                {
                    title: 'Labels, notes, saved replies',
                    body: 'Label conversations, keep private notes only you can see, save replies you use often. Search finds old messages fast.',
                },
            ],
        },
    },
    flow: {
        eyebrow: 'Get started',
        title: 'Four steps to one inbox',
        subtitle: 'Nothing to download. Open a browser on your computer or phone and you are ready.',
        steps: [
            { title: 'Sign up', body: 'With email or your Google account. Your inbox is ready at once.' },
            { title: 'Pick an @username', body: 'The name friends on Yona use to find you.' },
            { title: 'Connect Zalo, Gmail', body: 'Scan a QR code for personal Zalo, sign in with Google for Gmail.' },
            { title: 'Start chatting', body: "Reply to Zalo and email, or type a friend's @username to message them." },
        ],
    },
    rules: {
        eyebrow: 'Privacy and safety',
        title: 'Your inbox, and the honest fine print',
        items: [
            {
                title: 'Only you get in',
                body: 'Every account has its own inbox. Nobody else can be added to it to read your messages.',
            },
            {
                title: 'A word about Zalo',
                body: 'Personal Zalo connects through a QR code, not an official Zalo gateway. Zalo may restrict the account or end the connection, so weigh that before you connect.',
            },
            {
                title: 'Stored on our servers',
                body: 'Messages are kept on Yona servers so you can read them on any device. Yona is not end-to-end encrypted, so do not send passwords or OTP codes here.',
            },
            {
                title: 'Feels like a phone app',
                body: 'Add Yona to your home screen from the browser and get notified when new messages arrive.',
            },
        ],
    },
    closing: { title: 'Bring your messages together' },
    footer: {
        tagline: 'A personal inbox for Zalo, email and friends that runs right in your browser.',
        copyright: '© :year Yona. All rights reserved.',
        product: 'Product',
        account: 'Account',
        language: 'Language',
        note: 'Made in Vietnam.',
    },
};

const COPY_BY_LOCALE: Record<string, LandingCopy> = { vi: VI, en: EN };

/** Ngôn ngữ chưa có bản dịch thì rơi về tiếng Việt, thị trường chính. */
export function landingCopy(locale: string): LandingCopy {
    return COPY_BY_LOCALE[locale] ?? VI;
}
