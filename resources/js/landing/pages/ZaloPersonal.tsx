import type { Item, LandingConfig, ZaloPageStrings } from '../config';
import { CtaPair } from '../components/Button';
import { AccentBar, Feature } from '../components/Feature';
import { MediaFrame, ProductShot } from '../components/ProductShot';
import { ACCENT, Eyebrow, Section, type Accent } from '../components/Section';

/**
 * Trang một-kênh cho Zalo cá nhân.
 *
 * Vì sao có trang riêng: trang chủ nói về mọi kênh cùng lúc nên không xếp hạng
 * được cho đúng thứ Yona khác biệt, và không có link nào gửi riêng cho khách
 * đang hỏi về Zalo.
 *
 * Khuôn giống trang chủ (cùng dấu góc, cùng nhịp, cùng thang chữ) — đây là cùng
 * một bề mặt, không phải một trang đi lạc. Khác một chỗ có chủ đích: có một
 * section nói thẳng rủi ro. Zalo cá nhân không có API chính thức, và để khách tự
 * phát hiện sau khi đã chuyển việc sang là mất khách.
 */
export function ZaloPersonal({ config }: { config: LandingConfig }) {
    const { strings, urls } = config;
    const page = strings.zalo_page;

    // Nút phụ giữa bài KHÔNG được là "về trang chủ": đặt một lối thoát ngay trước
    // bằng chứng của chính section đó là mời người đọc rời đi đúng lúc sắp
    // thuyết phục được họ.
    const cta = {
        primary: { label: page.hero.cta_primary, href: urls.demo },
        secondary: { label: strings.cta.primary, href: urls.register },
        learn: strings.cta.learn,
    };

    return (
        <>
            {/* Hero chia đôi. Bản trước để chữ chiếm 45% bề ngang và bỏ trống hẳn nửa
                phải: trang bán một sản phẩm NHÌN được mà hero không cho thấy sản phẩm
                nào. Ảnh là danh sách liên hệ chứ không phải ảnh Zalo, vì câu hero hứa
                "mỗi khách tự thành một hồ sơ" và ảnh này không mang icon kênh nào để
                nói sai. */}
            <Section surface="base" rhythm="md" accent="primary">
                {/* 5/4 chứ không 1/1: cột nửa màn chỉ 521px trong khi `text-h1` đạt
                    trần 54px cần 620px cho nửa dài nhất của tiêu đề — nghịch lý là màn
                    RỘNG hơn lại vỡ nhiều dòng hơn, vì `clamp` theo viewport chứ không
                    theo bề rộng cột thật (đo 21/09: 1440px vỡ 4 dòng, 1280px chỉ 2).
                    5/4 cho cột chữ 623px và giữ ảnh ở 499px — chữ trong ảnh 11.0px,
                    gần như không đổi so với 11.4px. Tỉ lệ 3/2 cho chữ thoáng hơn nhưng
                    kéo ảnh xuống 9.9px, đổi lại đúng thứ vừa sửa. */}
                <div className="grid items-center gap-10 md:grid-cols-9 md:gap-12">
                    <div className="md:col-span-5">
                        <Eyebrow accent="primary">{page.hero.eyebrow}</Eyebrow>

                        <h1 className="mt-5 text-balance text-h1">
                            {page.hero.title_a}
                            <br />
                            {page.hero.title_b}
                        </h1>

                        <p className="mt-5 text-lead font-light text-neutral-700">{page.hero.lead}</p>

                        <div className="mt-8">
                            <CtaPair
                                primary={{ label: page.hero.cta_primary, href: urls.demo }}
                                secondary={{ label: page.hero.cta_secondary, href: `${urls.home}#features` }}
                            />
                        </div>
                    </div>

                    <MediaFrame className="md:col-span-4">
                        {/* Bản CROP, không phải ảnh nguyên màn hình. Ảnh gốc 1600x728
                            ép xuống ~520px trong khung này thì chữ 16px còn 5.2px —
                            không đọc nổi, tức ảnh không còn chứng minh được gì. Crop
                            728x312 (ba thẻ liên hệ, bỏ sidebar) cho 11.4px ở cùng bề
                            ngang. C2 vẫn đạt: nhát cắt phải rơi vào nền thẻ, không
                            xuyên chữ. */}
                        <ProductShot
                            src="/landing/feature-contacts-crop.png"
                            alt="Ba liên hệ trong Yona, mỗi dòng có tên và số điện thoại khách"
                            width={728}
                            height={312}
                        />
                    </MediaFrame>
                </div>
            </Section>

            <ItemGrid
                surface="band"
                accent="primary"
                title={page.problem.title}
                items={page.problem.items}
            />

            <Feature
                surface="base"
                accent="primary"
                strings={page.solution}
                cta={cta}
                learnHref={urls.demo}
                media={{
                    kind: 'split',
                    shot: {
                        src: '/landing/feature-zalo-tall.png',
                        alt: 'Hội thoại Zalo cá nhân trong hộp thư Yona, kèm danh sách các hội thoại khác',
                        width: 920,
                        height: 900,
                    },
                }}
            />

            <CapsRow strings={page.caps} />

            <Section surface="base" rhythm="md" accent="primary">
                <div className="bg-neutral-100 p-6 md:p-16">
                    <Eyebrow accent="primary">{page.risk.eyebrow}</Eyebrow>

                    <h2 className="mt-5 max-w-4xl text-h1">{page.risk.title}</h2>

                    <p className="mt-5 max-w-reading text-base font-light text-neutral-700">{page.risk.body}</p>

                    {/* Gạch ngang 8×2, KHÔNG ô vuông 8×8: `landing.md` dành hình
                        vuông cho bốn góc section, bốn góc thẻ và đầu nhãn eyebrow.
                        Bullet danh sách không có trong bảng đó, mà dùng chung hình
                        thì một dấu hiệu phải gánh bốn vai — đếm 21/09 trên trang này
                        có 39 ô vuông, không còn phân biệt được cấp nào với cấp nào. */}
                    <ul className="mt-8 grid max-w-4xl gap-x-12 gap-y-4 md:grid-cols-2">
                        {Object.entries(page.risk.points).map(([key, line]) => (
                            <li key={key} className="flex gap-4">
                                <span aria-hidden className={`mt-3 h-0.5 w-2 shrink-0 ${ACCENT.primary}`} />
                                <span className="text-base text-neutral-700">{line}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </Section>

            <Section surface="base" rhythm="xl" accent="neutral">
                <div className="mx-auto text-center">
                    <h2 className="text-balance text-display">{page.closing.title}</h2>

                    <p className="mx-auto mt-6 max-w-reading text-pretty text-base font-light text-neutral-700">
                        {page.closing.lead}
                    </p>

                    <div className="mt-8">
                        <CtaPair
                            align="center"
                            primary={{ label: page.closing.cta_primary, href: urls.demo }}
                            secondary={{ label: page.closing.cta_secondary, href: urls.home }}
                        />
                    </div>
                </div>
            </Section>
        </>
    );
}

/**
 * Hàng bốn cột cho khối năng lực.
 *
 * Phải khác `ItemGrid` của khối "vấn đề" nằm ngay trên nó. Bản trước dùng chung
 * một component cho cả hai và đo được các gạch accent rơi đúng cùng toạ độ y
 * (317, 345, 447, 475) — cuộn qua đọc như một section bị lặp lại. Cùng một luật
 * đã ghi cho ba khối tính năng ở trang chủ: lặp một dạng thì khối thứ hai đọc y
 * hệt khối thứ nhất.
 */
// Icon khớp nghĩa từng năng lực, không phải trang trí — Lucide theo luật §11.
// Đây là thứ phân biệt `CapsRow` với `ItemGrid` NGAY CẢ Ở MOBILE, nơi cả hai
// đều xếp một cột: đo 21/09 · 390px hai section đó cùng nền, cùng 4 mục, cùng
// 0 ảnh 0 nút, cao 851 vs 845px — chênh 6px, cuộn qua đọc như bị lặp.
const CAPS_ICON: Record<string, string> = {
    recall: 'i-lucide-undo-2',
    reaction: 'i-lucide-smile',
    group: 'i-lucide-users',
    rich: 'i-lucide-map-pin',
};

function CapsRow({ strings }: { strings: ZaloPageStrings['caps'] }) {
    return (
        <Section surface="band" rhythm="lg" accent="primary">
            <h2 className="max-w-4xl text-h1">{strings.title}</h2>

            <div className="mt-10 grid gap-x-8 gap-y-10 md:mt-14 md:grid-cols-4">
                {Object.entries(strings.items).map(([key, item]) => (
                    <div key={key} className="relative">
                        <span
                            aria-hidden
                            className={`${CAPS_ICON[key] ?? 'i-lucide-check'} mb-4 block size-6 text-primary-700`}
                        />
                        {/* `md:min-h-[2lh]`: hai trong bốn tiêu đề xuống 2 dòng, hai cái
                            kia 1 dòng, nên body của bốn cột bắt đầu ở hai độ cao khác
                            nhau (đo 21/09 · 1440px: y 364 và 388) và hàng chữ gãy giữa
                            cột 2 với cột 3. Đặt sàn bằng 2 dòng để mọi body cùng
                            baseline; chỉ từ `md` vì dưới đó bốn cột xếp dọc. */}
                        <h3 className="text-h3 md:min-h-[2lh]">{item.title}</h3>
                        <p className="mt-2.5 text-base text-neutral-600">{item.description}</p>
                    </div>
                ))}
            </div>

            {/* `text-base` + `neutral-700`, KHÔNG `text-sm`/`neutral-500` như một
                ghi chú: câu này là cam kết "đang chạy thật, không phải kế hoạch" —
                thứ đáng giá nhất của cả section, mà trình bày như chân trang thì nó
                đọc ra là dòng bị bỏ quên. */}
            <p className="mt-10 max-w-reading text-base text-neutral-700">{strings.note}</p>
        </Section>
    );
}

/**
 * Lưới ô đánh dấu bằng thanh accent, dùng cho khối "vấn đề".
 *
 * Hai cột chứ không phải ba: mỗi ô có hai dòng chữ nên ba cột làm dòng chữ ngắn
 * còn bốn năm từ, đọc thành gạch đầu dòng chứ không thành ô.
 */
function ItemGrid({
    surface,
    accent,
    eyebrow,
    title,
    note,
    items,
}: {
    surface: 'base' | 'band';
    accent: Accent;
    eyebrow?: string;
    title: string;
    note?: string;
    items: Record<string, Item>;
}) {
    return (
        <Section surface={surface} rhythm="lg" accent={accent}>
            {eyebrow && <Eyebrow accent={accent}>{eyebrow}</Eyebrow>}

            {/* `max-w-4xl` chứ không `2xl`: ở 2xl (672px) tiêu đề dừng ở 57% bề ngang
                trong khi lưới bên dưới chạy hết 1265px — đo 21/09 · 1440px thấy lệch
                418px giữa hai mép phải, đọc ra như CSS chưa gắn xong. 4xl vẫn giữ
                dòng dưới ngưỡng đọc được (tiêu đề dài nhất cần 1315px nếu một dòng). */}
            <h2 className={`${eyebrow ? 'mt-5' : ''} max-w-4xl text-h1`}>{title}</h2>

            <div className="mt-10 grid md:mt-12 md:grid-cols-2">
                {Object.entries(items).map(([key, item]) => (
                    <div key={key} className="relative p-6">
                        <AccentBar accent={accent} className="w-1/5" />
                        <div className="flex gap-8">
                            <span aria-hidden className={`mt-1 size-2 shrink-0 ${ACCENT[accent]}`} />
                            <div>
                                <h3 className="text-h3">{item.title}</h3>
                                <p className="mt-2.5 text-base text-neutral-600">{item.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {note && <p className="mt-8 text-sm text-neutral-500">{note}</p>}
        </Section>
    );
}
