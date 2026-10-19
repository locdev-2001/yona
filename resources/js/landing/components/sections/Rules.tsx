import type { LandingCopy } from '../../copy';
import { Eyebrow, Section } from '../Section';

// Mỗi ý có một tấm tranh phía trên. Tỉ lệ 4:3 (không vuông): tranh vuông chiếm
// phần lớn chiều cao section; hạ tỉ lệ thì mảng màu của tranh không mất, chỉ mỏng lại.
const ART = ['rule-1', 'rule-2', 'rule-3', 'rule-4'] as const;

export function Rules({ copy }: { copy: LandingCopy['rules'] }) {
    return (
        <Section surface="band" accent="navy">
            <Eyebrow accent="navy">{copy.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-h1">{copy.title}</h2>

            <dl className="mt-10 grid gap-x-8 gap-y-12 md:mt-14 md:grid-cols-4">
                {copy.items.map((item, index) => (
                    <div key={item.title}>
                        <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                            <img
                                aria-hidden
                                alt=""
                                src={`/landing/art/${ART[index % ART.length]}.webp`}
                                width={249}
                                height={187}
                                loading="lazy"
                                decoding="async"
                                className="size-full select-none object-contain p-4"
                            />
                        </div>
                        <dt className="mt-4 text-h3 font-normal text-neutral-900">{item.title}</dt>
                        <dd className="mt-2.5 text-sm font-light text-neutral-600">{item.body}</dd>
                    </div>
                ))}
            </dl>
        </Section>
    );
}
