import type { LandingConfig } from '../config';
import { BrandLogo } from './BrandLogo';
import { ButtonLink } from './Button';

// Nav phẳng: trắng đặc, không viền dưới, không bóng, không blur. Nó tách khỏi
// trang bằng chính độ sáng.
/** Các mục chỉ hiện ở desktop; dưới 768px chúng nằm trong `MenuDiDong`. */
const LIEN_KET = [
    { key: 'features', href: (urls: LandingConfig['urls']) => `${urls.home}#features` },
    { key: 'pricing', href: (urls: LandingConfig['urls']) => `${urls.home}#pricing` },
    { key: 'demo', href: (urls: LandingConfig['urls']) => urls.demo },
] as const;

export function Header({ config }: { config: LandingConfig }) {
    const { brand, urls, strings, isAuthenticated } = config;

    return (
        <header className="fixed inset-x-0 top-0 z-50 h-16 bg-neutral-0">
            <div className="mx-auto flex h-full max-w-container items-center justify-between px-4 md:px-10">
                <a
                    href={urls.home}
                    className="flex h-11 items-center rounded md:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                    <BrandLogo brand={brand} />
                </a>

                <nav className="flex items-center gap-1 md:gap-2">
                    {LIEN_KET.map((muc) => (
                        <a
                            key={muc.key}
                            href={muc.href(urls)}
                            className="hidden h-11 items-center rounded px-3 text-neutral-700 md:inline-flex md:h-10 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                        >
                            {strings.nav[muc.key]}
                        </a>
                    ))}

                    <LocaleSwitch config={config} />

                    {isAuthenticated ? (
                        <ButtonLink href={urls.dashboard}>{strings.nav.dashboard}</ButtonLink>
                    ) : (
                        <>
                            <ButtonLink href={urls.login} variant="ghost" className="hidden md:inline-flex">
                                {strings.nav.login}
                            </ButtonLink>
                            <ButtonLink href={urls.register}>{strings.nav.register}</ButtonLink>
                        </>
                    )}

                    <MenuDiDong config={config} />
                </nav>
            </div>
        </header>
    );
}

/**
 * Hai ngôn ngữ thì không cần dropdown — bày thẳng cả hai ra, cái đang bật là
 * chữ đen, cái kia là link. Chọn xong middleware nhớ bằng cookie.
 */
function LocaleSwitch({ config }: { config: LandingConfig }) {
    const { locales, locale, strings } = config;

    if (locales.length < 2) {
        return null;
    }

    return (
        <div
            aria-label={strings.nav.language}
            // ml-2/pl-3: gạch dọc phải nằm GIỮA hai cụm. Trước đây chỉ có pl-2 nên nó
            // cách mục nav bên trái 12px mà cách "VI" 16px, dính hẳn về bên trái và
            // đọc ra như dấu phân cách của mục nav chứ không phải của bộ ngôn ngữ.
            className="mr-1 flex items-center gap-0.5 md:ml-3 md:mr-2 md:border-l md:border-neutral-300 md:pl-3"
        >
            {locales.map((option) => {
                const active = option.code === locale;

                return (
                    <a
                        key={option.code}
                        href={option.url}
                        hrefLang={option.code}
                        lang={option.code}
                        aria-current={active ? 'true' : undefined}
                        className={`inline-flex h-11 min-w-11 items-center justify-center rounded px-2 text-sm uppercase md:h-10 md:min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                            // neutral-700 chứ không phải 500: ở 14px in hoa, 500 đọc ra như
                            // đã bị vô hiệu hoá thay vì một lựa chọn bấm được.
                            active ? 'text-neutral-900' : 'text-neutral-700 hover:text-neutral-900'
                        }`}
                    >
                        {option.code}
                    </a>
                );
            })}
        </div>
    );
}

/**
 * Menu dưới 768px.
 *
 * Dựng bằng `<details>` chứ không bằng state React: đóng/mở, phím Enter/Space,
 * và thứ tự tab đã là hành vi sẵn có của thẻ này. Một `Dialog` cho bốn liên kết
 * đổi lấy state, overlay, focus trap, khoá cuộn và một phụ thuộc mới.
 *
 * Lý do tồn tại: trước đây bốn mục chỉ mang `hidden md:inline-flex` và không có
 * gì thay thế — khách mở trên điện thoại mất đường vào Bảng giá, Đặt lịch demo
 * và **Đăng nhập** (đo 21/09 · 390px: nav chỉ còn logo, vi/en, Dùng thử).
 */
function MenuDiDong({ config }: { config: LandingConfig }) {
    const { urls, strings, isAuthenticated } = config;

    const muc = [
        ...LIEN_KET.map((mot) => ({ key: mot.key, href: mot.href(urls), label: strings.nav[mot.key] })),
        isAuthenticated
            ? { key: 'dashboard', href: urls.dashboard, label: strings.nav.dashboard }
            : { key: 'login', href: urls.login, label: strings.nav.login },
    ];

    // `<details>` native không đóng bằng Esc và không đóng khi bấm ra ngoài — hai
    // thứ người dùng mong đợi ở một menu. `popover` cho cả hai miễn phí nhưng chỉ
    // có từ Safari 17; iOS cũ hơn sẽ thấy nút bấm không làm gì, tệ hơn là thiếu Esc.
    const dong = (su_kien: { currentTarget: HTMLElement }) => {
        su_kien.currentTarget.closest('details')?.removeAttribute('open');
    };

    return (
        <details
            onKeyDown={(e) => e.key === 'Escape' && dong(e)}
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && dong(e)}
            className="relative md:hidden [&[open]_.i-lucide-menu]:hidden [&:not([open])_.i-lucide-x]:hidden"
        >
            <summary
                aria-label={strings.nav.menu}
                className="flex size-11 cursor-pointer list-none items-center justify-center rounded text-neutral-700 [&::-webkit-details-marker]:hidden active:scale-[0.97] hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
                <span aria-hidden className="i-lucide-menu size-6" />
                <span aria-hidden className="i-lucide-x size-6" />
            </summary>

            {/* `hidden` + `[[open]>&]:block`: `<details>` đóng chỉ ẩn con bằng
                `content-visibility`, mà `position:absolute` bỏ qua cơ chế đó —
                không có dòng này thì bốn liên kết hiện cả khi menu đang đóng
                (đo 21/09 · 390px: panel vẫn ở 150,54 224×194). */}
            <div className="hidden [[open]>&]:block" onClick={(e) => dong(e as never)}>
                {/* Panel rộng nửa màn thì cắt ngang tiêu đề hero phía sau, đọc ra
                    như lỗi render chứ không như menu. Lớp phủ đặc tách hai lớp —
                    KHÔNG `backdrop-filter` (luật §2). Bấm vào nó cũng đóng menu:
                    thẻ `<label>` bọc ngoài không dùng được cho `<details>`, nên
                    dùng `onClick` một dòng ở phần tử cha. */}
                <span aria-hidden className="fixed inset-x-0 bottom-0 top-16 z-40 bg-neutral-900/40" />

                {/* `top-full` neo dưới thanh nav 64px. `shadow-overlay` là ngoại lệ
                    duy nhất của luật §1, dành đúng cho lớp phủ nổi như menu này. */}
                <div className="absolute right-0 top-full z-50 w-56 border border-neutral-300 bg-neutral-0 py-2 shadow-overlay">
                    {muc.map((mot) => (
                        <a
                            key={mot.key}
                            href={mot.href}
                            className="flex h-11 items-center px-4 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600"
                        >
                            {mot.label}
                        </a>
                    ))}
                </div>
            </div>
        </details>
    );
}
