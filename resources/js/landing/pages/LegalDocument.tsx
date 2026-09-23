import type { LandingConfig, LegalSection } from '../config';
import { ButtonLink } from '../components/Button';
import { ACCENT, Eyebrow, Section } from '../components/Section';

/**
 * Điều khoản sử dụng và chính sách riêng tư: cùng một khuôn đọc, khác văn bản.
 *
 * Một cột `max-w-reading` từ đầu tới cuối: văn bản pháp lý được đọc tuần tự,
 * không có gì để đặt cạnh nhau. Mỗi mục có `id` bằng khoá của nó để gửi link
 * thẳng tới một mục (`/chinh-sach-rieng-tu#zalo_session`).
 *
 * Accent `navy`: trang nói về dữ liệu, thuộc mạch hồ sơ/dữ liệu chứ không phải
 * mạch hội thoại.
 */
export function LegalDocument({ config }: { config: LandingConfig }) {
    const legalDocument = config.legalDocument;

    if (!legalDocument) {
        return null;
    }

    return (
        <Section surface="base" rhythm="md" accent="navy">
            <article className="max-w-reading">
                <Eyebrow accent="navy">{legalDocument.eyebrow}</Eyebrow>
                <h1 className="mt-5 text-balance text-h1">{legalDocument.title}</h1>
                <p className="mt-4 text-sm text-neutral-600">{legalDocument.updated}</p>
                <p className="mt-8 text-lead font-light text-neutral-700">{legalDocument.lead}</p>

                {Object.entries(legalDocument.sections).map(([key, section]) => (
                    <LegalSectionBlock key={key} id={key} section={section} />
                ))}

                <aside className="mt-16 border-t border-neutral-300 pt-8">
                    <p className="font-mono text-eyebrow uppercase text-neutral-500">{legalDocument.related.heading}</p>
                    <div className="mt-4">
                        <ButtonLink href={legalDocument.related.href} variant="secondary">
                            {legalDocument.related.label}
                        </ButtonLink>
                    </div>
                </aside>
            </article>
        </Section>
    );
}

function LegalSectionBlock({ id, section }: { id: string; section: LegalSection }) {
    return (
        <section id={id} className="mt-12 scroll-mt-20 border-t border-neutral-300 pt-8">
            <h2 className="text-h2">{section.heading}</h2>

            {section.body &&
                Object.entries(section.body).map(([key, paragraph]) => (
                    <p key={key} className="mt-4 text-base font-light text-neutral-700">
                        {paragraph}
                    </p>
                ))}

            {section.points && (
                <ul className="mt-4 flex flex-col gap-3">
                    {Object.entries(section.points).map(([key, point]) => (
                        <li key={key} className="flex gap-4">
                            <span aria-hidden className={`mt-3 h-0.5 w-2 shrink-0 ${ACCENT.navy}`} />
                            <span className="text-base font-light text-neutral-700">{point}</span>
                        </li>
                    ))}
                </ul>
            )}

            {section.note && <p className="mt-4 text-base font-light text-neutral-600">{section.note}</p>}
        </section>
    );
}
