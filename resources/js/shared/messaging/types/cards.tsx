import type { CardItem, StructuredAction, StructuredMessage } from '../model';
import { actions, price, records, safeUrl, text } from '../parse';
import { defineMessageType } from '../registry';
import { Carousel } from '../kit/Carousel';
import { ActionBar, KitRoot, Media, PriceBlock } from '../kit/primitives';
import { useSubmission } from '../kit/useSubmission';

// Thẻ sản phẩm nằm ngang: ảnh 88px bên trái, tên + giá + dòng phụ bên phải, nút
// bên dưới. Một thẻ rộng 272px; nhiều thẻ thành băng trượt ngang 252px/thẻ để tin
// không kéo dài khung chat (founder chốt 25/09).

/** Dòng phụ: "Còn 2 cái" do shop ghi, không thì tóm biến thể "3 màu · 2 cỡ". */
function subline(item: CardItem): string | undefined {
    if (item.stock_label) return item.stock_label;
    if (item.variants?.length) return item.variants.map(variant => `${variant.options.length} ${variant.name.toLowerCase()}`).join(' · ');

    return item.description;
}

function Card({ item, message, onReply }: { item: CardItem; message: StructuredMessage; onReply?: (action: StructuredAction) => void }) {
    const line = subline(item);

    return (
        <article className="mk-card mk-card--round mk-pad" style={{ padding: 12 }} aria-label={item.title}>
            <div className="mk-row" style={{ alignItems: 'flex-start' }}>
                {item.media_url ? <Media src={item.media_url} /> : null}
                <div className="mk-stack" style={{ gap: 3, paddingTop: 2 }}>
                    <h3 className="mk-title">{item.title}</h3>
                    {item.price ? <PriceBlock price={item.price} /> : null}
                    {line ? <span className="mk-meta">{line}</span> : null}
                </div>
            </div>
            <ActionBar actions={item.actions} message={message} itemId={item.id} onReply={onReply} />
        </article>
    );
}

function CardsView({ model, message }: { model: CardItem[]; message: StructuredMessage }) {
    const { values, submit } = useSubmission(message);
    const onReply = values ? undefined : (action: StructuredAction) => submit([{ title: action.label, value: action.value ?? action.label }]);

    if (model.length === 1) {
        return (
            <KitRoot>
                <Card item={model[0]} message={message} onReply={onReply} />
            </KitRoot>
        );
    }

    return (
        <KitRoot>
            <Carousel count={model.length}>
                {model.map(item => (
                    <Card key={item.id} item={item} message={message} onReply={onReply} />
                ))}
            </Carousel>
        </KitRoot>
    );
}

function parseItem(raw: Record<string, unknown>, index: number): CardItem | null {
    const title = text(raw.title);
    if (!title) return null;

    const variants = (records(raw.variants) ?? []).flatMap(variant => {
        const name = text(variant.name);
        const options = (records(variant.options) ?? []).flatMap(option =>
            text(option.value)
                ? [{ value: String(option.value), label: text(option.label) ?? String(option.value), media_url: safeUrl(option.media_url), disabled: option.disabled === true }]
                : [],
        );

        return name && options.length ? [{ name, options }] : [];
    });

    return {
        id: text(raw.id) ?? `item-${index + 1}`,
        title,
        description: text(raw.description),
        media_url: safeUrl(raw.media_url),
        price: price(raw.price),
        stock_label: text(raw.stock_label),
        max_quantity: typeof raw.max_quantity === 'number' ? raw.max_quantity : undefined,
        variants: variants.length ? variants : undefined,
        actions: actions(raw.actions),
    };
}

export default defineMessageType<CardItem[]>({
    contentType: 'cards',
    content: 'host',
    side: 'agent',
    parse: attributes => {
        const items = (records(attributes.items) ?? []).map(parseItem);

        return items.length > 0 && items.every(item => item !== null) ? (items as CardItem[]) : null;
    },
    View: CardsView,
});
