import { useState } from 'react';

import type { FeatureStrings } from '../config';
import { ArtMark } from './ArtMark';
import { CtaPair, TextLink } from './Button';
import { InnerMarks, MediaFrame, ProductShot } from './ProductShot';
import { ACCENT, Eyebrow, Section, type Accent } from './Section';

type Shot = { src: string; alt: string; width: number; height: number };

/**
 * Ba dạng media, KHÔNG phải một dạng lặp ba lần.
 *
 * Bề mặt tham chiếu dùng: (wide) ảnh rộng + lưới ba cột bên dưới · (split) ảnh
 * trong panel trái, các mục mở/đóng bên phải · (triptych) ba ảnh vuông. Lặp
 * nguyên một dạng cho cả ba khối thì khối thứ hai đọc y hệt khối thứ nhất.
 */
type Media =
    | { kind: 'wide'; shot: Shot }
    | { kind: 'split'; shot: Shot }
    | { kind: 'triptych'; shots: [Shot, Shot, Shot] };

interface FeatureProps {
    id?: string;
    strings: FeatureStrings;
    media: Media;
    art: { src: string; width: number; height: number };
    cta: { primary: { label: string; href: string }; secondary: { label: string; href: string }; learn: string };
    learnHref: string;
    surface?: 'base' | 'band';
    accent?: Accent;
}

export function Feature({ id, strings, media, art, cta, learnHref, surface = 'base', accent = 'primary' }: FeatureProps) {
    const cards = Object.entries(strings.cards);

    return (
        <Section id={id} surface={surface} accent={accent}>
            {/* Tranh nét nằm ở nửa phải, ngang hàng tiêu đề — nếu không, hàng tiêu
                đề 54px chiếm nửa trái và bỏ trống nửa phải, lặp ba lần thành ba
                mảng rỗng. Nét mực nền trong suốt nên nó lùi sau chữ, không tranh
                chỗ với tiêu đề như một tấm ảnh đặc sẽ làm. */}
            <ArtMark src={art.src} width={art.width} height={art.height} size="w-48 2xl:w-60" className="right-10 top-0" />

            <Eyebrow accent={accent}>{strings.eyebrow}</Eyebrow>

            <h2 className="relative mt-5 max-w-2xl text-h1">
                {strings.title_a}
                <br />
                {strings.title_b}
            </h2>

            <p className="relative mt-5 max-w-reading text-base font-light text-neutral-700">{strings.body}</p>

            <div className="relative mt-7">
                <CtaPair primary={cta.primary} secondary={cta.secondary} />
            </div>

            {media.kind === 'split' ? (
                <Split media={media} cards={cards} accent={accent} />
            ) : media.kind === 'wide' ? (
                <>
                    <MediaFrame className="mt-14 md:mt-20">
                        <ProductShot {...media.shot} />
                    </MediaFrame>
                    <CardRow cards={cards} learn={cta.learn} learnHref={learnHref} accent={accent} />
                </>
            ) : (
                <>
                    <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-3">
                        {media.shots.map((shot) => (
                            <MediaFrame key={shot.src} framed={false} className="aspect-square">
                                <ProductShot {...shot} cover />
                            </MediaFrame>
                        ))}
                    </div>
                    <CardRow cards={cards} learn={cta.learn} learnHref={learnHref} accent={accent} large />
                </>
            )}
        </Section>
    );
}

/**
 * Thanh accent 2px ở đỉnh ô, dài một phần năm bề ngang ô.
 *
 * Bản trước ghi "đo được 82px / 18px". Sai: đó là THANH TIẾN TRÌNH của carousel
 * bên bề mặt tham chiếu, bắt được giữa lúc đang chạy — đo lại sau 1.8 giây thì
 * nó đã nở từ 42px lên 106px. Ta không có carousel nên dùng một tỉ lệ cố định,
 * và ghi rõ đây là lựa chọn của mình chứ không phải số đo.
 *
 * Vẫn là đoạn ngắn chứ không phải border-t: kẻ suốt hàng nối các ô thành một
 * dải liền, đoạn ngắn thì đánh dấu từng ô riêng.
 */
export function AccentBar({ accent, className }: { accent: Accent; className: string }) {
    return <span aria-hidden className={`absolute left-0 top-0 h-0.5 ${ACCENT[accent]} ${className}`} />;
}

/**
 * Lưới ba cột dưới media. Ô đầu có nền — nó là điểm vào của mắt sau khi rời
 * khỏi ảnh, và ba ô phẳng như nhau thì không ô nào được đọc trước.
 *
 * Không có khoảng hở giữa các ô: mỗi ô rộng đúng một phần ba container, và
 * thanh accent ở đỉnh đã tách chúng ra.
 */
function CardRow({
    cards,
    learn,
    learnHref,
    accent,
    large = false,
}: {
    cards: [string, { title: string; body: string }][];
    learn: string;
    learnHref: string;
    accent: Accent;
    large?: boolean;
}) {
    return (
        <div className="mt-10 grid md:mt-12 md:grid-cols-3">
            {cards.map(([key, card], i) => (
                <div key={key} className={`relative p-6 ${i === 0 ? 'bg-neutral-900/5' : ''}`}>
                    <AccentBar accent={accent} className="w-1/5" />
                    <div className="flex gap-8">
                        <span aria-hidden className={`mt-1 size-2 shrink-0 ${ACCENT[accent]}`} />
                        <div>
                            <h3 className={large ? 'text-h2' : 'text-h3'}>{card.title}</h3>
                            <p className="mt-2.5 text-base text-neutral-600">{card.body}</p>
                            <div className="mt-4">
                                <TextLink href={learnHref}>{learn}</TextLink>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Ảnh bên trái, các mục mở được bên phải. Tỉ lệ 3/5 · 2/5 và không có khoảng hở
 * — đo được 702px ảnh + 468px danh sách trên container 1170.
 */
function Split({
    media,
    cards,
    accent,
}: {
    media: { shot: Shot };
    cards: [string, { title: string; body: string }][];
    accent: Accent;
}) {
    const [open, setOpen] = useState(0);

    return (
        <div className="mt-14 grid md:mt-20 md:grid-cols-5">
            <MediaFrame className="flex items-center md:col-span-3 md:aspect-square">
                <ProductShot {...media.shot} />
            </MediaFrame>

            <div className="flex flex-col md:col-span-2">
                {cards.map(([key, card], i) => {
                    const on = i === open;

                    return (
                        <button
                            key={key}
                            type="button"
                            aria-expanded={on}
                            onClick={() => setOpen(i)}
                            className={`relative flex-1 p-6 text-left transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                                on ? 'bg-neutral-900/5' : 'hover:bg-neutral-50'
                            }`}
                        >
                            <AccentBar accent={accent} className="w-1/5" />
                            <div className="flex gap-8">
                                <span aria-hidden className={`mt-1 size-2 shrink-0 ${ACCENT[accent]}`} />
                                <div>
                                    <h3 className={`text-h3 ${on ? 'text-neutral-900' : 'text-neutral-500'}`}>{card.title}</h3>
                                    <p className={`mt-2.5 text-base ${on ? 'text-neutral-700' : 'text-neutral-500'}`}>
                                        {card.body}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export { InnerMarks };
