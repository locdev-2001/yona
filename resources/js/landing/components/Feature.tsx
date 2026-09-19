import { useState } from 'react';

import type { FeatureStrings } from '../config';
import { ArtMark } from './ArtMark';
import { CtaPair, TextLink } from './Button';
import { MediaWell, ProductShot, type MediaTone } from './ProductShot';
import { Eyebrow, Section } from './Section';

type Shot = { src: string; alt: string; width: number; height: number };

/**
 * Ba dạng media, KHÔNG phải một dạng lặp ba lần.
 *
 * Bề mặt tham chiếu dùng: (wide) ảnh rộng + lưới ba cột bên dưới · (split) ảnh
 * trong panel trái, các mục mở/đóng bên phải · (triptych) ba ảnh vuông. Lặp
 * nguyên một dạng cho cả ba khối thì khối thứ hai đọc y hệt khối thứ nhất.
 */
type Media =
    | { kind: 'wide'; tone?: MediaTone; shot: Shot }
    | { kind: 'split'; tone?: MediaTone; shot: Shot }
    | { kind: 'triptych'; tone?: MediaTone; shots: [Shot, Shot, Shot] };

interface FeatureProps {
    id?: string;
    strings: FeatureStrings;
    media: Media;
    art: { src: string; width: number; height: number };
    cta: { primary: { label: string; href: string }; secondary: { label: string; href: string }; learn: string };
    learnHref: string;
    surface?: 'base' | 'band';
}

export function Feature({ id, strings, media, art, cta, learnHref, surface = 'base' }: FeatureProps) {
    const cards = Object.entries(strings.cards);

    return (
        <Section id={id} surface={surface}>
            {/* Tranh nét nằm ở nửa phải, ngang hàng tiêu đề — nếu không, hàng tiêu
                đề 54px chiếm nửa trái và bỏ trống nửa phải, lặp ba lần thành ba
                mảng rỗng. Nét mực nền trong suốt nên nó lùi sau chữ, không tranh
                chỗ với tiêu đề như một tấm ảnh đặc sẽ làm. */}
            <ArtMark src={art.src} width={art.width} height={art.height} className="right-10 top-0" />

            <Eyebrow>{strings.eyebrow}</Eyebrow>

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
                <Split media={media} cards={cards} tone={media.tone} />
            ) : media.kind === 'wide' ? (
                <>
                    <MediaWell tone={media.tone} className="mt-14 md:mt-20">
                        <ProductShot {...media.shot} />
                    </MediaWell>
                    <CardRow cards={cards} learn={cta.learn} learnHref={learnHref} />
                </>
            ) : (
                <>
                    <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-3">
                        {media.shots.map((shot, i) => (
                            <MediaWell key={shot.src} tone={([ 'linen', 'sage', 'sand' ] as const)[i]} className="p-4 md:p-6">
                                <ProductShot {...shot} />
                            </MediaWell>
                        ))}
                    </div>
                    <CardRow cards={cards} learn={cta.learn} learnHref={learnHref} large />
                </>
            )}
        </Section>
    );
}

/**
 * Lưới ba cột dưới media. Ô đầu có nền — nó là điểm vào của mắt sau khi rời
 * khỏi ảnh, và ba ô phẳng như nhau thì không ô nào được đọc trước.
 */
function CardRow({
    cards,
    learn,
    learnHref,
    large = false,
}: {
    cards: [string, { title: string; body: string }][];
    learn: string;
    learnHref: string;
    large?: boolean;
}) {
    return (
        <div className="mt-10 grid gap-4 md:mt-12 md:grid-cols-3">
            {cards.map(([key, card], i) => (
                <div key={key} className={i === 0 ? 'bg-neutral-100 p-6' : 'p-6'}>
                    <h3 className={large ? 'text-h2' : 'text-h3'}>{card.title}</h3>
                    <p className="mt-2.5 text-sm font-light text-neutral-600">{card.body}</p>
                    <div className="mt-4">
                        <TextLink href={learnHref}>{learn}</TextLink>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Ảnh bên trái, các mục mở được bên phải. Mục đang mở có nền và chữ đậm hơn. */
function Split({
    media,
    cards,
    tone,
}: {
    media: { shot: Shot };
    cards: [string, { title: string; body: string }][];
    tone?: MediaTone;
}) {
    const [open, setOpen] = useState(0);

    return (
        <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-2">
            <MediaWell tone={tone} className="flex items-center">
                <ProductShot {...media.shot} />
            </MediaWell>

            <div className="flex flex-col gap-2">
                {cards.map(([key, card], i) => {
                    const on = i === open;

                    return (
                        <button
                            key={key}
                            type="button"
                            aria-expanded={on}
                            onClick={() => setOpen(i)}
                            className={`flex-1 rounded-none p-6 text-left transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                                on ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                            }`}
                        >
                            <h3 className={`text-h3 ${on ? 'text-neutral-900' : 'text-neutral-500'}`}>{card.title}</h3>
                            <p className={`mt-2.5 text-sm font-light ${on ? 'text-neutral-700' : 'text-neutral-500'}`}>
                                {card.body}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
