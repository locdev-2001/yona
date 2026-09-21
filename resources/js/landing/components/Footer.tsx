import { fillPlaceholders, type LandingConfig } from '../config';
import { BrandLogo } from './BrandLogo';

// Chỉ liệt kê đích thật sự tồn tại; không dựng link chết cho đầy cột.
export function Footer({ config }: { config: LandingConfig }) {
    const { brand, strings, urls, year, locale, locales } = config;

    const columns = [
        {
            heading: strings.footer.product,
            links: [
                { label: strings.nav.features, href: `${urls.home}#features` },
                { label: strings.nav.zalo, href: urls.zalo },
                { label: strings.nav.pricing, href: `${urls.home}#pricing` },
                { label: strings.nav.demo, href: urls.demo },
            ],
        },
        {
            heading: strings.footer.account,
            links: [
                { label: strings.nav.login, href: urls.login },
                { label: strings.nav.register, href: urls.register },
            ],
        },
        {
            heading: strings.footer.language,
            links: locales.map((option) => ({
                label: option.label,
                href: option.url,
                current: option.code === locale,
            })),
        },
    ];

    return (
        <footer className="border-t border-neutral-300 bg-neutral-0">
            <div className="mx-auto max-w-container px-4 py-14 md:px-10 md:py-20">
                {/* Ba cột link xếp 2 cột từ 380px, không phải 1 cột dọc suốt.
                    Đo 21/09 · 390px: một cột cho 8 link (mỗi link min-h-11 theo
                    luật đích chạm) đẩy footer lên 920px — nặng gấp 1.6 lần nội
                    dung trang cảm ơn, khách phải vuốt thêm màn hình rưỡi chỉ để
                    thấy dòng bản quyền. */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-5">
                    <div className="col-span-2 max-w-sm">
                        <BrandLogo brand={brand} />
                        <p className="mt-4 text-sm font-light text-neutral-600">{strings.footer.tagline}</p>
                    </div>

                    {columns.map((column) => (
                        <nav key={column.heading}>
                            {/* pb-1 để nhịp dưới tiêu đề cột ra gần 16px như số đo
                                thật, thay vì đổi lineHeight dùng chung của cả trang. */}
                            <p className="font-mono text-eyebrow font-medium uppercase text-neutral-500 pb-1">
                                {column.heading}
                            </p>
                            <ul className="mt-5 space-y-1">
                                {column.links.map((link) => (
                                    <li key={link.label}>
                                        {/* Link cột: weight THƯỜNG + gạch chân mảnh theo số
                                            đo thật (14/18, có underline) — không phải
                                            font-light kế thừa từ body. Gạch chân dùng
                                            neutral-300 để không cạnh tranh với chữ, đậm
                                            hơn khi hover. Vùng bấm ≥44px dưới 768px giữ
                                            nguyên bằng min-h-11. */}
                                        <a
                                            href={link.href}
                                            aria-current={'current' in link && link.current ? 'true' : undefined}
                                            className={`inline-flex min-h-11 items-center rounded text-sm font-normal underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-600 md:min-h-0 md:py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                                                'current' in link && link.current
                                                    ? 'text-neutral-900'
                                                    : 'text-neutral-600 hover:text-neutral-900'
                                            }`}
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                {/* Hàng cuối tách riêng: bản quyền và định vị sản phẩm không thuộc
                    về cột link nào. */}
                <div className="mt-16 flex flex-col gap-2 border-t border-neutral-300 pt-6 text-caption text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
                    <p>{fillPlaceholders(strings.footer.copyright, { year })}</p>
                    <p>{strings.footer.note}</p>
                </div>
            </div>
        </footer>
    );
}
