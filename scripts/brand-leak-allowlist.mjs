// Nguồn DUY NHẤT của mẫu tên nền tảng cũ và danh sách chỗ được phép giữ nó.
// `scripts/check-brand-leak.mjs` đọc file này; không file nào khác được viết tên cũ.
//
// Mỗi mục: `path` (đường dẫn đúng, tiền tố thư mục kết thúc bằng `/`, hoặc RegExp),
// `tokens` (chuỗi đúng hoặc RegExp; ANY_TOKEN = mọi token trong file đó), `reason`
// một dòng. Thêm mục mới chỉ khi tên cũ là contract bên ngoài hoặc nghĩa vụ pháp lý —
// chữ khách thấy, comment, tên biến thì phải SỬA, không allowlist.

export const LEGACY_BRAND_PATTERN = /chatwoot|chwt\.app/i;

export const ANY_TOKEN = Symbol('ANY_TOKEN');

// Chuỗi contract mà mã nhúng/app nhúng của khách đã dán vẫn gọi tới — được phép có
// trong bundle phát ra trình duyệt (chế độ --build) để website cũ không gãy.
export const LEGACY_CONTRACT_TOKENS = [
    'chatwoot',
    'chatwootSDK',
    'chatwootSettings',
    '$chatwoot',
    'chatwoot-widget:',
    'chatwoot-dashboard-app:fetch-info',
    /^chatwoot:[\w-]+$/,
];

export const SOURCE_ALLOWLIST = [
    {
        path: 'scripts/brand-leak-allowlist.mjs',
        tokens: ANY_TOKEN,
        reason: 'Chính file định nghĩa mẫu cần tìm.',
    },
    {
        path: 'THIRD_PARTY_NOTICES.md',
        tokens: ANY_TOKEN,
        reason: 'Thông báo bản quyền MIT phải giữ nguyên văn (nghĩa vụ giấy phép).',
    },
    {
        path: 'refs/',
        tokens: ANY_TOKEN,
        reason: 'Mã nguồn tham chiếu bên thứ ba, không theo dõi trong git, không phát hành.',
    },
    {
        path: 'plans/',
        tokens: ANY_TOKEN,
        reason: 'Lịch sử kế hoạch nội bộ, không theo dõi trong git, không phát hành.',
    },
    {
        path: 'package.json',
        tokens: [/^npm:@chatwoot\//],
        reason: 'Tên gói npm thật trên registry, chỉ nằm trong khai báo bí danh @ext/*.',
    },
    {
        path: 'pnpm-lock.yaml',
        tokens: [/^(npm:)?@chatwoot\//, /^mailto:[\w.-]+@chatwoot\.com$/],
        reason: 'Lockfile chép nguyên metadata gói npm thật (tên gói, email tác giả).',
    },
    {
        path: 'app/Services/Webhooks/Trigger.php',
        tokens: ['X-Chatwoot'],
        reason: 'Tiền tố header webhook cũ gửi song song với X-Yona để máy nhận đã viết theo tên cũ vẫn kiểm được chữ ký.',
    },
    {
        path: 'resources/js/shared/legacyContracts.ts',
        tokens: ANY_TOKEN,
        reason: 'Tên công khai đời trước của SDK nhúng và app nhúng dashboard — bí danh để mã nhúng khách đã dán không gãy.',
    },
];
