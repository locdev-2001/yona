import type { LandingStrings } from '../../config';
import { Eyebrow, Section } from '../Section';

// Bốn bước nối tiếp. Không phải bốn thẻ đều nhau: các bước có thứ tự, và đường
// kẻ trên đầu cho thấy chúng liền mạch.
//
// Section này cố tình KHÔNG có ảnh. Nó nằm giữa hai section đều có hình, nên
// một nhịp chỉ-chữ ở đây là quãng nghỉ; thêm ảnh vào chỉ kéo dài trang.
const ORDER = ['capture', 'qualify', 'nurture', 'close'] as const;

export function Flow({ strings }: { strings: LandingStrings['flow'] }) {
    return (
        <Section surface="base" rhythm="md">
            <Eyebrow>{strings.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-h1">{strings.title}</h2>
            <p className="mt-5 max-w-reading text-base font-light text-neutral-700">{strings.subtitle}</p>

            <ol className="mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
                {ORDER.map((key, index) => {
                    const step = strings.steps[key];

                    return (
                        <li key={key} className="border-t border-neutral-900 pt-5">
                            <span className="font-mono text-caption text-neutral-500">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <h3 className="mt-3 text-h3">{step.title}</h3>
                            <p className="mt-2.5 text-sm font-light text-neutral-600">{step.description}</p>
                        </li>
                    );
                })}
            </ol>
        </Section>
    );
}
