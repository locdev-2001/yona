// Chữ của bề mặt công khai, theo từng ngôn ngữ. Chỉ chứa lời giới thiệu sản phẩm;
// đường dẫn, thương hiệu, nhãn pháp lý và danh sách ngôn ngữ vẫn do máy chủ đẩy
// xuống qua `landingConfig`.

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
    meta: { title: string; description: string };
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
    features: { people: FeatureCopy; conversation: FeatureCopy };
    flow: { eyebrow: string; title: string; subtitle: string; steps: Card[] };
    rules: { eyebrow: string; title: string; items: Card[] };
    closing: { title: string };
    footer: { tagline: string; copyright: string; product: string; account: string; language: string; note: string };
}

const VI: LandingCopy = {
    meta: {
        title: 'Yona · Nhắn tin với bạn bè',
        description:
            'Yona là ứng dụng nhắn tin cho bạn bè và người thân: nhắn riêng, lập nhóm, tìm nhau bằng @username. Mở ngay trên trình duyệt, cài lên điện thoại như một ứng dụng.',
    },
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
        title_lead: 'Trò chuyện với bạn bè',
        title_focus: 'nhắn riêng hay cả nhóm',
        title_tail: 'ngay trên trình duyệt',
        subtitle:
            'Yona là ứng dụng nhắn tin cho bạn bè và người thân. Đăng ký, chọn một @username, rồi nhắn riêng cho từng người hoặc lập nhóm cho cả hội.',
        fine: 'Đăng ký bằng email hoặc tài khoản Google.',
    },
    features: {
        people: {
            eyebrow: 'Nhắn riêng và nhóm',
            title_a: 'Một người hay cả nhóm,',
            title_b: 'đều ở chung một chỗ',
            body: 'Nhắn riêng cho từng người, hoặc lập nhóm cho gia đình, lớp học, hội bạn. Nhóm có trưởng nhóm và phó nhóm, tối đa 500 người.',
            cards: [
                {
                    title: 'Tìm nhau bằng @username',
                    body: 'Mỗi người có một @username riêng. Gõ tên là tìm thấy, không cần trao số điện thoại.',
                },
                {
                    title: 'Mời vào nhóm bằng link',
                    body: 'Thêm bạn vào nhóm bằng @username, hoặc gửi link mời để ai có link cũng vào được.',
                },
                {
                    title: 'Trưởng nhóm, phó nhóm',
                    body: 'Trưởng nhóm giao quyền phó nhóm để cùng quản lý thành viên. Nhóm phẳng, không chia kênh con.',
                },
            ],
        },
        conversation: {
            eyebrow: 'Trò chuyện tự nhiên',
            title_a: 'Biết bạn đã xem,',
            title_b: 'biết bạn đang gõ',
            body: 'Những thứ bạn quen dùng khi nhắn tin đều có sẵn, và tin mới hiện ra ngay khi bạn bè vừa gửi.',
            cards: [
                {
                    title: 'Đã xem, đang gõ',
                    body: 'Thấy ngay tin đã được đọc hay bạn đang trả lời, không phải đoán.',
                },
                {
                    title: 'Trả lời, cảm xúc, sticker',
                    body: 'Trích đúng tin muốn trả lời, thả cảm xúc lên tin, gửi sticker thay lời.',
                },
                {
                    title: 'Ảnh, file, chuyển khoản',
                    body: 'Gửi ảnh và file ngay trong cuộc trò chuyện. Cần chuyển tiền thì gửi thẻ chuyển khoản có mã VietQR để bạn quét.',
                },
            ],
        },
    },
    flow: {
        eyebrow: 'Cách bắt đầu',
        title: 'Bốn bước tới tin nhắn đầu tiên',
        subtitle: 'Không phải tải gì về. Mở trình duyệt trên máy tính hoặc điện thoại là dùng được.',
        steps: [
            { title: 'Đăng ký', body: 'Bằng email hoặc tài khoản Google.' },
            { title: 'Chọn @username', body: 'Cái tên để bạn bè tìm thấy bạn.' },
            { title: 'Tìm bạn', body: 'Gõ @username của bạn bè, hoặc mở link mời vào nhóm.' },
            { title: 'Nhắn tin', body: 'Nhắn riêng hay cả nhóm, trên máy tính lẫn điện thoại.' },
        ],
    },
    rules: {
        eyebrow: 'Bạn làm chủ hộp tin',
        title: 'Người lạ không tự chen vào cuộc trò chuyện của bạn',
        items: [
            {
                title: 'Tin chờ cho người lạ',
                body: 'Tin từ người chưa từng trò chuyện với bạn nằm riêng ở Tin chờ. Bạn chấp nhận thì mới thành cuộc trò chuyện, không thì xoá.',
            },
            {
                title: 'Chặn là chặn hai chiều',
                body: 'Chặn một người thì cả hai không nhắn được cho nhau nữa, cho tới khi bạn bỏ chặn.',
            },
            {
                title: 'Báo cáo vi phạm',
                body: 'Báo cáo một người, một cuộc trò chuyện hay một tin nhắn. Đội ngũ Yona xem và xử lý.',
            },
            {
                title: 'Như ứng dụng trên điện thoại',
                body: 'Cài Yona lên màn hình chính từ trình duyệt và nhận thông báo khi có tin mới.',
            },
        ],
    },
    closing: { title: 'Rủ bạn bè vào Yona' },
    footer: {
        tagline: 'Ứng dụng nhắn tin cho bạn bè và người thân, chạy ngay trên trình duyệt.',
        copyright: '© :year Yona. Đã đăng ký bản quyền.',
        product: 'Sản phẩm',
        account: 'Tài khoản',
        language: 'Ngôn ngữ',
        note: 'Làm tại Việt Nam.',
    },
};

const EN: LandingCopy = {
    meta: {
        title: 'Yona · Messaging for friends',
        description:
            'Yona is a messaging app for friends and family: direct messages, group chats, find each other by @username. Runs in your browser and installs on your phone like an app.',
    },
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
        title_lead: 'Talk with your friends',
        title_focus: 'one to one or as a group',
        title_tail: 'right in your browser',
        subtitle:
            'Yona is a messaging app for friends and family. Sign up, pick an @username, then message people directly or start a group for the whole crew.',
        fine: 'Sign up with email or your Google account.',
    },
    features: {
        people: {
            eyebrow: 'Direct and group chats',
            title_a: 'One person or a whole group,',
            title_b: 'all in one place',
            body: 'Message people one to one, or start a group for family, class or friends. Groups have an owner and admins, up to 500 members.',
            cards: [
                {
                    title: 'Find people by @username',
                    body: 'Everyone has their own @username. Type it to find them, no phone numbers to swap.',
                },
                {
                    title: 'Invite with a link',
                    body: 'Add friends to a group by @username, or share an invite link so anyone with it can join.',
                },
                {
                    title: 'Owners and admins',
                    body: 'Group owners can make members admins to help manage the group. Groups stay flat, no sub-channels.',
                },
            ],
        },
        conversation: {
            eyebrow: 'Natural conversations',
            title_a: 'See when it is read,',
            title_b: 'see who is typing',
            body: 'The things you expect from a messaging app are all there, and new messages show up the moment they are sent.',
            cards: [
                {
                    title: 'Read receipts and typing',
                    body: 'See right away whether a message was read or a friend is replying.',
                },
                {
                    title: 'Replies, reactions, stickers',
                    body: 'Quote the exact message you are answering, react to messages, send a sticker instead of words.',
                },
                {
                    title: 'Photos, files, bank transfers',
                    body: 'Share photos and files in the chat. Need to send money? Share a bank transfer card with a VietQR code to scan.',
                },
            ],
        },
    },
    flow: {
        eyebrow: 'Get started',
        title: 'Four steps to your first message',
        subtitle: 'Nothing to download. Open a browser on your computer or phone and you are ready.',
        steps: [
            { title: 'Sign up', body: 'With email or your Google account.' },
            { title: 'Pick an @username', body: 'The name friends use to find you.' },
            { title: 'Find friends', body: "Type a friend's @username, or open a group invite link." },
            { title: 'Start chatting', body: 'One to one or in groups, on desktop and on mobile.' },
        ],
    },
    rules: {
        eyebrow: 'Your inbox, your call',
        title: 'Strangers cannot just walk into your chats',
        items: [
            {
                title: 'Message requests',
                body: 'Messages from people you have never talked to wait in Requests. Accept to start the conversation, or delete them.',
            },
            {
                title: 'Blocking works both ways',
                body: 'Block someone and neither of you can message the other until you unblock.',
            },
            {
                title: 'Report abuse',
                body: 'Report a person, a conversation or a single message. The Yona team reviews every report.',
            },
            {
                title: 'Feels like a phone app',
                body: 'Add Yona to your home screen from the browser and get notified when new messages arrive.',
            },
        ],
    },
    closing: { title: 'Bring your friends to Yona' },
    footer: {
        tagline: 'A messaging app for friends and family that runs right in your browser.',
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
