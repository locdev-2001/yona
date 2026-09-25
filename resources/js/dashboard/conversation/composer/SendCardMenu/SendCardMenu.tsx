import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveStructured, StructuredMessageView } from 'shared/messaging';
import NextButton from 'dashboard/components-next/button/Button';
import Dialog, { type DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Input from 'dashboard/components-next/input/Input';
import Popover from 'dashboard/components-next/popover/Popover';
import { uploadFile } from 'dashboard/helper/uploadHelper';

import { t } from '../../../../i18n';
import {

    productError,
    productPayload,
    quickRepliesError,
    quickRepliesPayload,
    QUICK_REPLY_LIMITS,
    withPreviewDiscount,
    type ProductDraft,
    type QuickRepliesDraft,
    type StructuredDraft,
} from './cardPayloads';

type CardKind = 'quick_replies' | 'product';

const CARD_KINDS: { kind: CardKind; icon: string }[] = [
    { kind: 'quick_replies', icon: 'i-lucide-list-checks' },
    { kind: 'product', icon: 'i-lucide-shopping-bag' },
];

const k = (key: string, values?: Record<string, string | number>) => t(`CONVERSATION.SEND_CARD.${key}`, values);

const EMPTY_QUICK_REPLIES: QuickRepliesDraft = { question: '', options: ['', ''] };
const EMPTY_PRODUCT: ProductDraft = {
    title: '',
    mediaUrl: '',
    price: '',
    compareAt: '',
    stockLabel: '',
    maxQuantity: '',
    variants: [{ name: '', options: '' }],
    link: '',
};

/** Thẻ đúng như khách thấy trên widget: vẽ bằng chính message kit, chỉ xem. */
function CardPreview({ draft }: { draft: StructuredDraft }) {
    const message = {
        id: 'preview',
        message_type: 1,
        content: draft.content ?? null,
        content_type: draft.contentType,
        content_attributes: withPreviewDiscount(draft).contentAttributes,
    };
    const resolved = resolveStructured(message);

    return (
        <div className="flex min-h-[220px] flex-col gap-2 rounded-xl bg-n-alpha-1 p-3">
            <span className="text-xs font-medium text-n-slate-11">{k('PREVIEW')}</span>
            {draft.content ? <p className="m-0 max-w-[280px] rounded-2xl bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12">{draft.content}</p> : null}
            {resolved ? <StructuredMessageView resolved={resolved} message={message} /> : <span className="text-sm text-n-slate-10">{k('PREVIEW_EMPTY')}</span>}
        </div>
    );
}

function QuickRepliesForm({ draft, onChange }: { draft: QuickRepliesDraft; onChange: (draft: QuickRepliesDraft) => void }) {
    const setOption = (index: number, value: string) =>
        onChange({ ...draft, options: draft.options.map((option, at) => (at === index ? value : option)) });

    return (
        <div className="flex flex-col gap-3">
            <Input label={k('QUICK_REPLIES.QUESTION')} value={draft.question} maxLength={2000} onChange={event => onChange({ ...draft, question: event.target.value })} />
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1 text-sm font-medium text-n-slate-12">{k('QUICK_REPLIES.OPTIONS')}</legend>
                {draft.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input
                            className="flex-1"
                            aria-label={k('QUICK_REPLIES.OPTION', { index: index + 1 })}
                            value={option}
                            maxLength={QUICK_REPLY_LIMITS.title}
                            onChange={event => setOption(index, event.target.value)}
                        />
                        {draft.options.length > QUICK_REPLY_LIMITS.min ? (
                            <NextButton
                                type="button"
                                icon="i-lucide-x"
                                slate
                                faded
                                sm
                                title={k('REMOVE')}
                                onClick={() => onChange({ ...draft, options: draft.options.filter((_, at) => at !== index) })}
                            />
                        ) : null}
                    </div>
                ))}
                {draft.options.length < QUICK_REPLY_LIMITS.max ? (
                    <NextButton
                        type="button"
                        icon="i-lucide-plus"
                        link
                        sm
                        label={k('QUICK_REPLIES.ADD_OPTION')}
                        className="self-start"
                        onClick={() => onChange({ ...draft, options: [...draft.options, ''] })}
                    />
                ) : null}
            </fieldset>
        </div>
    );
}

function ProductForm({ draft, onChange }: { draft: ProductDraft; onChange: (draft: ProductDraft) => void }) {
    const [uploading, setUploading] = useState(false);
    const set = (patch: Partial<ProductDraft>) => onChange({ ...draft, ...patch });

    const upload = async (file: File | undefined) => {
        if (!file) return;
        setUploading(true);
        try {
            set({ mediaUrl: (await uploadFile(file)).fileUrl });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <Input label={k('PRODUCT.NAME')} value={draft.title} maxLength={120} onChange={event => set({ title: event.target.value })} />
            <div className="flex items-center gap-3">
                <span className="flex size-16 flex-none items-center justify-center overflow-hidden rounded-lg bg-n-alpha-2">
                    {draft.mediaUrl ? <img src={draft.mediaUrl} alt="" className="size-full object-cover" /> : <span className="i-lucide-image size-5 text-n-slate-10" />}
                </span>
                <label className="cursor-pointer text-sm font-medium text-n-blue-11">
                    {uploading ? k('PRODUCT.UPLOADING') : draft.mediaUrl ? k('PRODUCT.CHANGE_IMAGE') : k('PRODUCT.UPLOAD_IMAGE')}
                    <input type="file" accept="image/*" hidden onChange={event => void upload(event.target.files?.[0])} />
                </label>
                {draft.mediaUrl ? <NextButton type="button" link sm slate label={k('REMOVE')} onClick={() => set({ mediaUrl: '' })} /> : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Input label={k('PRODUCT.PRICE')} inputMode="numeric" value={draft.price} onChange={event => set({ price: event.target.value })} />
                <Input label={k('PRODUCT.COMPARE_AT')} inputMode="numeric" value={draft.compareAt} onChange={event => set({ compareAt: event.target.value })} />
                <Input label={k('PRODUCT.STOCK_LABEL')} placeholder={k('PRODUCT.STOCK_PLACEHOLDER')} maxLength={40} value={draft.stockLabel} onChange={event => set({ stockLabel: event.target.value })} />
                <Input label={k('PRODUCT.MAX_QUANTITY')} inputMode="numeric" value={draft.maxQuantity} onChange={event => set({ maxQuantity: event.target.value })} />
            </div>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1 text-sm font-medium text-n-slate-12">{k('PRODUCT.VARIANTS')}</legend>
                {draft.variants.map((variant, index) => (
                    <div key={index} className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                        <Input
                            aria-label={k('PRODUCT.VARIANT_NAME')}
                            placeholder={k('PRODUCT.VARIANT_NAME_PLACEHOLDER')}
                            value={variant.name}
                            maxLength={40}
                            onChange={event => set({ variants: draft.variants.map((item, at) => (at === index ? { ...item, name: event.target.value } : item)) })}
                        />
                        <Input
                            aria-label={k('PRODUCT.VARIANT_OPTIONS')}
                            placeholder={k('PRODUCT.VARIANT_OPTIONS_PLACEHOLDER')}
                            value={variant.options}
                            onChange={event => set({ variants: draft.variants.map((item, at) => (at === index ? { ...item, options: event.target.value } : item)) })}
                        />
                    </div>
                ))}
                {draft.variants.length < 3 ? (
                    <NextButton
                        type="button"
                        icon="i-lucide-plus"
                        link
                        sm
                        label={k('PRODUCT.ADD_VARIANT')}
                        className="self-start"
                        onClick={() => set({ variants: [...draft.variants, { name: '', options: '' }] })}
                    />
                ) : null}
            </fieldset>
            <Input label={k('PRODUCT.LINK')} type="url" placeholder="https://" value={draft.link} onChange={event => set({ link: event.target.value })} />
        </div>
    );
}

/**
 * Nút "Gửi thẻ" trên thanh soạn tin: chọn loại thẻ, điền form, xem trước đúng như khách thấy,
 * rồi gửi. Kênh không vẽ được thẻ thì máy chủ tự hạ xuống chữ (DeliveryPlanner).
 */
export default function SendCardMenu({ onSend }: { onSend: (draft: StructuredDraft) => void }) {
    const [kind, setKind] = useState<CardKind | null>(null);
    const [quickReplies, setQuickReplies] = useState(EMPTY_QUICK_REPLIES);
    const [product, setProduct] = useState(EMPTY_PRODUCT);
    const [showErrors, setShowErrors] = useState(false);
    const dialogRef = useRef<DialogHandle>(null);

    useEffect(() => {
        if (kind) dialogRef.current?.open();
    }, [kind]);

    const labels = { order: k('PRODUCT.ORDER_BUTTON'), view: k('PRODUCT.VIEW_BUTTON') };
    const draft = useMemo<StructuredDraft | null>(
        () => (kind === 'quick_replies' ? quickRepliesPayload(quickReplies) : kind === 'product' ? productPayload(product, labels) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [kind, quickReplies, product],
    );
    const error = kind === 'quick_replies' ? quickRepliesError(quickReplies) : kind === 'product' ? productError(product) : null;

    const close = () => {
        setKind(null);
        setShowErrors(false);
    };

    const send = () => {
        setShowErrors(true);
        if (error || !draft) return;
        onSend(draft);
        if (kind === 'quick_replies') setQuickReplies(EMPTY_QUICK_REPLIES);
        if (kind === 'product') setProduct(EMPTY_PRODUCT);
        dialogRef.current?.close();
    };

    return (
        <>
            <Popover
                align="start"
                trigger={() => <NextButton type="button" title={k('BUTTON')} icon="i-lucide-layout-panel-top" slate faded sm />}
                content={({ hide }) => (
                    <div role="menu" className="flex w-60 flex-col p-1">
                        {CARD_KINDS.map(item => (
                            <button
                                key={item.kind}
                                type="button"
                                role="menuitem"
                                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-start hover:bg-n-alpha-2"
                                onClick={() => {
                                    hide();
                                    setKind(item.kind);
                                }}
                            >
                                <span className={`${item.icon} mt-0.5 size-4 flex-none text-n-slate-11`} />
                                <span className="flex flex-col">
                                    <span className="text-sm font-medium text-n-slate-12">{k(`${item.kind.toUpperCase()}.TITLE`)}</span>
                                    <span className="text-xs text-n-slate-11">{k(`${item.kind.toUpperCase()}.HINT`)}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            />
            <Dialog
                    ref={dialogRef}
                    type="edit"
                    width="3xl"
                    title={kind ? k(`${kind.toUpperCase()}.TITLE`) : ''}
                    confirmButtonLabel={k('SEND')}
                    cancelButtonLabel={k('CANCEL')}
                    overflowYAuto
                    onConfirm={send}
                    onClose={close}
                >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="flex min-w-0 flex-col gap-3">
                            {kind === 'quick_replies' ? <QuickRepliesForm draft={quickReplies} onChange={setQuickReplies} /> : null}
                            {kind === 'product' ? <ProductForm draft={product} onChange={setProduct} /> : null}
                            {showErrors && error ? (
                                <p role="alert" className="m-0 text-sm text-n-ruby-11">
                                    {k(`ERRORS.${error}`)}
                                </p>
                            ) : null}
                        </div>
                        {draft ? <CardPreview draft={draft} /> : null}
                    </div>
            </Dialog>
        </>
    );
}

