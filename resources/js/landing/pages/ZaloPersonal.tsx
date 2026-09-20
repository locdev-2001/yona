import type { Item, LandingConfig } from '../config';
import { CtaPair } from '../components/Button';
import { AccentBar, Feature } from '../components/Feature';
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

    const cta = {
        primary: { label: page.hero.cta_primary, href: urls.demo },
        secondary: { label: page.closing.cta_secondary, href: urls.home },
        learn: strings.cta.learn,
    };

    return (
        <>
            <Section surface="base" rhythm="md" accent="primary">
                <Eyebrow accent="primary">{page.hero.eyebrow}</Eyebrow>

                <h1 className="mt-5 max-w-3xl text-balance text-h1">
                    {page.hero.title_a}
                    <br />
                    {page.hero.title_b}
                </h1>

                <p className="mt-5 max-w-reading text-lead font-light text-neutral-700">{page.hero.lead}</p>

                <div className="mt-8">
                    <CtaPair
                        primary={{ label: page.hero.cta_primary, href: urls.demo }}
                        secondary={{ label: page.hero.cta_secondary, href: `${urls.home}#features` }}
                    />
                </div>
            </Section>

            <ItemGrid
                surface="band"
                accent="primary"
                eyebrow={page.problem.eyebrow}
                title={page.problem.title}
                items={page.problem.items}
            />

            <Feature
                surface="base"
                accent="primary"
                strings={page.solution}
                art={{ src: 'feat-ink-2', width: 243, height: 300 }}
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

            <ItemGrid
                surface="band"
                accent="primary"
                eyebrow={page.caps.eyebrow}
                title={page.caps.title}
                note={page.caps.note}
                items={page.caps.items}
            />

            <Section surface="base" rhythm="md" accent="navy">
                <div className="bg-neutral-100 p-6 md:p-16">
                    <Eyebrow accent="navy">{page.risk.eyebrow}</Eyebrow>

                    <h2 className="mt-5 max-w-2xl text-h1">{page.risk.title}</h2>

                    <p className="mt-5 max-w-reading text-base font-light text-neutral-700">{page.risk.body}</p>

                    <ul className="mt-8 flex max-w-reading flex-col gap-4">
                        {Object.entries(page.risk.points).map(([key, line]) => (
                            <li key={key} className="flex gap-4">
                                <span aria-hidden className={`mt-2 size-2 shrink-0 ${ACCENT.navy}`} />
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
 * Lưới ô đánh dấu bằng thanh accent, dùng cho cả khối "vấn đề" và khối "làm được
 * thật".
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
    eyebrow: string;
    title: string;
    note?: string;
    items: Record<string, Item>;
}) {
    return (
        <Section surface={surface} rhythm="lg" accent={accent}>
            <Eyebrow accent={accent}>{eyebrow}</Eyebrow>

            <h2 className="mt-5 max-w-2xl text-h1">{title}</h2>

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
