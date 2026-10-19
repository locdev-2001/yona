import type { FeatureCopy } from '../copy';
import { ArtMark } from './ArtMark';
import { ACCENT, Eyebrow, Section, type Accent } from './Section';

interface FeatureProps {
    id?: string;
    copy: FeatureCopy;
    /** Tranh nét trang trí ở nửa phải, ngang hàng tiêu đề. */
    art?: { src: string; width: number; height: number };
    surface?: 'base' | 'band';
    accent?: Accent;
}

/**
 * Một khối tính năng: tiêu đề hai dòng, đoạn dẫn, rồi lưới ba ô. Không có ảnh
 * chụp sản phẩm cho tới khi có ảnh thật của màn chat.
 */
export function Feature({ id, copy, art, surface = 'base', accent = 'primary' }: FeatureProps) {
    return (
        <Section id={id} surface={surface} accent={accent}>
            {/* Tranh nét nằm ở nửa phải, ngang hàng tiêu đề: không có nó thì hàng
                tiêu đề chiếm nửa trái và bỏ trống nửa phải. Nét mực nền trong suốt
                nên lùi sau chữ. */}
            {art && (
                <ArtMark src={art.src} width={art.width} height={art.height} size="w-48 2xl:w-60" className="right-10 top-0" />
            )}

            <Eyebrow accent={accent}>{copy.eyebrow}</Eyebrow>

            <h2 className="relative mt-5 max-w-2xl text-h1">
                {copy.title_a}
                <br />
                {copy.title_b}
            </h2>

            <p className="relative mt-5 max-w-reading text-base font-light text-neutral-700">{copy.body}</p>

            <CardRow cards={copy.cards} accent={accent} />
        </Section>
    );
}

/**
 * Thanh accent 2px ở đỉnh ô, dài một phần năm bề ngang ô. Đoạn ngắn chứ không
 * phải border-t: kẻ suốt hàng nối các ô thành một dải liền, đoạn ngắn thì đánh
 * dấu từng ô riêng.
 */
function AccentBar({ accent }: { accent: Accent }) {
    return <span aria-hidden className={`absolute left-0 top-0 h-0.5 w-1/5 ${ACCENT[accent]}`} />;
}

/**
 * Lưới ba cột. Ô đầu có nền: nó là điểm vào của mắt, ba ô phẳng như nhau thì
 * không ô nào được đọc trước.
 */
function CardRow({ cards, accent }: { cards: FeatureCopy['cards']; accent: Accent }) {
    return (
        <div className="mt-10 grid md:mt-14 md:grid-cols-3">
            {cards.map((card, i) => (
                <div key={card.title} className={`relative p-6 ${i === 0 ? 'bg-neutral-900/5' : ''}`}>
                    <AccentBar accent={accent} />
                    <div className="flex gap-8">
                        <span aria-hidden className={`mt-1 size-2 shrink-0 ${ACCENT[accent]}`} />
                        <div>
                            <h3 className="text-h3">{card.title}</h3>
                            <p className="mt-2.5 text-base text-neutral-600">{card.body}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
