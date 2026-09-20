import type { LandingConfig } from '../config';
import { CtaPair } from '../components/Button';
import { ACCENT, Eyebrow, Section } from '../components/Section';

/**
 * Trang cảm ơn sau khi gửi form.
 *
 * Chỉ hiện khi lead ĐÃ nằm trong hộp thư. Nhận không thành công thì controller
 * đẩy về lại form kèm dữ liệu cũ, không hiện trang này — một trang cảm ơn cho
 * một lead đã mất là cách chắc nhất để không bao giờ biết mình mất lead.
 *
 * Nói rõ ba thứ khách đang muốn biết: khi nào được gọi, gọi thế nào, cần chuẩn
 * bị gì. `noindex` đặt trong blade.
 */
export function DemoThanks({ config }: { config: LandingConfig }) {
    const { strings, urls } = config;
    const thanks = strings.demo.thanks;

    return (
        <Section surface="base" rhythm="md" accent="primary" fill>
            <div className="mx-auto max-w-reading">
                <Eyebrow accent="primary">{thanks.eyebrow}</Eyebrow>

                <h1 className="mt-5 text-balance text-h1">{thanks.title}</h1>

                <p className="mt-5 text-lead font-light text-neutral-700">{thanks.lead}</p>

                <ul className="mt-8 flex flex-col gap-4">
                    {Object.entries(thanks.next).map(([key, line]) => (
                        <li key={key} className="flex gap-4">
                            <span aria-hidden className={`mt-2 size-2 shrink-0 ${ACCENT.primary}`} />
                            <span className="text-base font-light text-neutral-700">{line}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-10">
                    <CtaPair
                        primary={{ label: thanks.cta_zalo, href: urls.zalo }}
                        secondary={{ label: thanks.cta_home, href: urls.home }}
                    />
                </div>
            </div>
        </Section>
    );
}
