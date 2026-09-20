import type { LandingStrings } from '../../config';
import { MediaFrame } from '../ProductShot';
import { Eyebrow, Section } from '../Section';

// Mỗi nguyên tắc có một tấm tranh phía trên. Tỉ lệ 4:3 (không vuông) là điểm
// khác biệt chính so với bản trước: tranh vuông 249px chiếm phần lớn chiều cao
// section, đẩy khối này cao hơn bề mặt tham chiếu ~196px. Hạ tỉ lệ mà vẫn giữ
// bố cục 4 cột thì mảng màu của tranh không mất, chỉ mỏng lại.
const ITEMS = [
    { key: 'dedupe', art: 'rule-1' },
    { key: 'draft', art: 'rule-2' },
    { key: 'source', art: 'rule-3' },
    { key: 'respect', art: 'rule-4' },
] as const;

export function Rules({ strings }: { strings: LandingStrings['rules'] }) {
    return (
        <Section surface="band" accent="navy">
            <Eyebrow accent="navy">{strings.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-h1">{strings.title}</h2>

            <dl className="mt-10 grid gap-x-8 gap-y-12 md:mt-14 md:grid-cols-4">
                {ITEMS.map(({ key, art }) => {
                    const item = strings.items[key];

                    return (
                        <div key={key}>
                            {/* framed=false: đây là tranh trang trí trong lưới, không
                                phải khung ảnh sản phẩm nên không cần viền 1px. BỎ dấu
                                vuông bên trong: bốn tranh nhân bốn dấu là 16 dấu trong
                                một section, đo được tổng 21 dấu ở đây so với 4-8 ở các
                                section khác. Dày tới mức đọc ra là nhiễu. */}
                            <MediaFrame framed={false} className="aspect-[4/3]">
                                <img
                                    aria-hidden
                                    alt=""
                                    src={`/landing/art/${art}.webp`}
                                    width={249}
                                    height={187}
                                    loading="lazy"
                                    decoding="async"
                                    className="size-full select-none object-contain p-4"
                                />
                            </MediaFrame>
                            {/* Tiêu đề nhỏ trong thẻ là weight THƯỜNG màu MỰC ở bề mặt
                                tham chiếu — không phải font-light/neutral-700 kế thừa
                                từ body mặc định. */}
                            <dt className="mt-4 text-h3 font-normal text-neutral-900">{item.title}</dt>
                            <dd className="mt-2.5 text-sm font-light text-neutral-600">{item.description}</dd>
                        </div>
                    );
                })}
            </dl>
        </Section>
    );
}
