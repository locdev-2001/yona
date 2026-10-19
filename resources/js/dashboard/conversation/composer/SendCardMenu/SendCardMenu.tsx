import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveStructured, StructuredMessageView } from 'shared/messaging';
import NextButton from 'dashboard/components-next/button/Button';
import Dialog, { type DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Input from 'dashboard/components-next/input/Input';
import Popover from 'dashboard/components-next/popover/Popover';
import { uploadFile } from 'dashboard/helper/uploadHelper';
import { getJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { useAlert } from 'dashboard/composables/useAlert';
import { createCannedResponse, isShortCodeInvalid } from 'dashboard/composables/useCannedResponses';

import { t } from '../../../../i18n';
import BankTransferForm from './BankTransferForm';
import ScheduleForm from './ScheduleForm';
import {
    bankTransferError,
    bankTransferPayload,
    bankTransferPreviewAttributes,
    productError,
    productPayload,
    quickRepliesError,
    quickRepliesPayload,
    QUICK_REPLY_LIMITS,
    scheduleError,
    schedulePayload,
    withPreviewDiscount,
    type BankTransferDraft,
    type CardKind,
    type PaymentAccountOption,
    type ProductDraft,
    type QuickRepliesDraft,
    type ScheduleDraft,
    type StructuredDraft,
} from './cardPayloads';

const CARD_KINDS: { kind: CardKind; icon: string }[] = [
    { kind: 'bank_transfer', icon: 'i-lucide-landmark' },
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
const EMPTY_BANK_TRANSFER: BankTransferDraft = { paymentAccountId: null, amount: '', memo: '' };
const EMPTY_SCHEDULE: ScheduleDraft = { title: '', note: '', slots: [{ date: '', label: '' }] };

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
    // Ảnh tải lỗi (link hỏng, bị chặn) thì hiện ô trống như chưa có ảnh, không để icon ảnh vỡ.
    const [brokenImage, setBrokenImage] = useState(false);
    const set = (patch: Partial<ProductDraft>) => {
        if (patch.mediaUrl !== undefined) setBrokenImage(false);
        onChange({ ...draft, ...patch });
    };

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
                    {draft.mediaUrl && !brokenImage ? (
                        <img src={draft.mediaUrl} alt="" className="size-full object-cover" onError={() => setBrokenImage(true)} />
                    ) : (
                        <span className="i-lucide-image size-5 text-n-slate-10" />
                    )}
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

export interface CannedCardPayload {
    contentType: string;
    content: string | null;
    contentAttributes: Record<string, unknown>;
}

/**
 * Xem lại thẻ của một câu trả lời mẫu trước khi gửi. Thẻ chuyển khoản chỉ lưu
 * mã tài khoản/số tiền/nội dung (không lưu số tài khoản/QR) nên phải tự tra
 * lại từ `PaymentAccount`, cùng luật với BankTransferType::normalize.
 */
export function useCannedCardPreview(accountId: number, cannedCard: CannedCardPayload | null): StructuredDraft | null {
    const [preview, setPreview] = useState<StructuredDraft | null>(null);

    useEffect(() => {
        if (!cannedCard) {
            setPreview(null);
            return undefined;
        }

        if (cannedCard.contentType !== 'bank_transfer') {
            setPreview({ contentType: cannedCard.contentType, content: cannedCard.content ?? undefined, contentAttributes: cannedCard.contentAttributes });
            return undefined;
        }

        let alive = true;
        setPreview(null);
        const paymentAccountId = cannedCard.contentAttributes.payment_account_id;
        const amount = cannedCard.contentAttributes.amount;
        const memo = typeof cannedCard.contentAttributes.memo === 'string' ? cannedCard.contentAttributes.memo : '';

        getJson<{ payload: PaymentAccountOption[] }>(`/api/v1/accounts/${accountId}/payment_accounts`)
            .then(({ payload }) => {
                const account = payload.find(item => item.id === paymentAccountId);
                if (!alive || !account) return;

                const query = new URLSearchParams({
                    ...(typeof amount === 'number' ? { amount: String(amount) } : {}),
                    ...(memo.trim() ? { memo: memo.trim() } : {}),
                });

                getJson<{ qr_payload: string }>(`/api/v1/accounts/${accountId}/payment_accounts/${account.id}/preview?${query}`)
                    .then(({ qr_payload: qrPayload }) => {
                        if (!alive) return;
                        setPreview({
                            contentType: 'bank_transfer',
                            contentAttributes: bankTransferPreviewAttributes(account, qrPayload, typeof amount === 'number' ? amount : null, memo),
                        });
                    })
                    .catch(() => alive && setPreview(null));
            })
            .catch(() => alive && setPreview(null));

        return () => {
            alive = false;
        };
    }, [accountId, cannedCard]);

    return preview;
}

/**
 * Nút "Gửi thẻ" trên thanh soạn tin: chọn loại thẻ, điền form, xem trước đúng như khách thấy,
 * rồi gửi. Kênh không vẽ được thẻ thì máy chủ tự hạ xuống chữ (DeliveryPlanner).
 */
export interface SendCardTarget {
    accountId: number;
    conversationDisplayId: number | null;
    onSend: (draft: StructuredDraft) => void;
    // Chọn một câu trả lời mẫu mang thẻ trong ô soạn (xem Editor.tsx): mở sẵn
    // dialog này để nhân viên xem lại rồi bấm Gửi, không sửa từng trường.
    cannedCard?: CannedCardPayload | null;
    onCannedCardConsumed?: () => void;
}

export default function SendCardMenu({ accountId, conversationDisplayId, onSend, cannedCard = null, onCannedCardConsumed }: SendCardTarget) {
    const [kind, setKind] = useState<CardKind | null>(null);
    const [quickReplies, setQuickReplies] = useState(EMPTY_QUICK_REPLIES);
    const [product, setProduct] = useState(EMPTY_PRODUCT);
    const [bankTransfer, setBankTransfer] = useState(EMPTY_BANK_TRANSFER);
    const [bankPreview, setBankPreview] = useState<StructuredDraft | null>(null);
    const [schedule, setSchedule] = useState(EMPTY_SCHEDULE);
    const [showErrors, setShowErrors] = useState(false);
    const [shortCode, setShortCode] = useState('');
    const [isSavingCanned, setSavingCanned] = useState(false);
    const dialogRef = useRef<DialogHandle>(null);
    const cannedCardPreview = useCannedCardPreview(accountId, cannedCard);

    useEffect(() => {
        if (kind || cannedCard) dialogRef.current?.open();
    }, [kind, cannedCard]);

    const labels = { order: k('PRODUCT.ORDER_BUTTON'), view: k('PRODUCT.VIEW_BUTTON') };
    const draft = useMemo<StructuredDraft | null>(() => {
        switch (kind) {
            case 'quick_replies':
                return quickRepliesPayload(quickReplies);
            case 'product':
                return productPayload(product, labels);
            case 'bank_transfer':
                return bankTransferPayload(bankTransfer);
            case 'schedule':
                return schedulePayload(schedule);
            default:
                return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind, quickReplies, product, bankTransfer, schedule]);
    const error = {
        quick_replies: () => quickRepliesError(quickReplies),
        product: () => productError(product),
        bank_transfer: () => bankTransferError(bankTransfer),
        schedule: () => scheduleError(schedule),
    }[kind ?? 'quick_replies']();
    // Thẻ chuyển khoản xem trước bằng bản máy chủ dựng (có mã QR thật), không bằng payload gửi đi.
    // Câu trả lời mẫu: xem trước bằng bản đã tra lại (useCannedCardPreview), gửi bằng đúng bản đã lưu.
    const preview = cannedCard ? cannedCardPreview : kind === 'bank_transfer' ? bankPreview : draft;

    const close = () => {
        setKind(null);
        setShowErrors(false);
        setShortCode('');
        if (cannedCard) onCannedCardConsumed?.();
    };

    const send = () => {
        if (cannedCard) {
            onSend({ contentType: cannedCard.contentType, content: cannedCard.content ?? undefined, contentAttributes: cannedCard.contentAttributes });
            onCannedCardConsumed?.();
            dialogRef.current?.close();
            return;
        }

        setShowErrors(true);
        if (error || !draft) return;
        onSend(draft);
        if (kind === 'quick_replies') setQuickReplies(EMPTY_QUICK_REPLIES);
        if (kind === 'product') setProduct(EMPTY_PRODUCT);
        if (kind === 'bank_transfer') setBankTransfer(EMPTY_BANK_TRANSFER);
        if (kind === 'schedule') setSchedule(EMPTY_SCHEDULE);
        dialogRef.current?.close();
    };

    // Lưu đúng thẻ đang soạn thành một câu trả lời mẫu, không gửi đi. Thẻ
    // chuyển khoản đã ở đúng dạng cần lưu (payment_account_id/amount/memo,
    // không có số tài khoản/QR) — máy chủ kiểm lại và từ chối nếu sai.
    const saveAsCanned = async () => {
        if (error || !draft || isShortCodeInvalid(shortCode)) return;

        setSavingCanned(true);
        try {
            await createCannedResponse(accountId, {
                short_code: shortCode.trim(),
                content: draft.content,
                content_type: draft.contentType,
                content_attributes: draft.contentAttributes,
            });
            useAlert(k('SAVE_AS_CANNED_SUCCESS'));
            setShortCode('');
        } catch (err) {
            useAlert(parseApiErrorMessage(err) || k('SAVE_AS_CANNED_ERROR'));
        } finally {
            setSavingCanned(false);
        }
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
                    title={kind ? k(`${kind.toUpperCase()}.TITLE`) : cannedCard ? k('REVIEW_TITLE') : ''}
                    confirmButtonLabel={k('SEND')}
                    cancelButtonLabel={k('CANCEL')}
                    overflowYAuto
                    onConfirm={send}
                    onClose={close}
                >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="flex min-w-0 flex-col gap-3">
                            {cannedCard ? (
                                <p className="m-0 text-sm text-n-slate-11">{k('REVIEW_HINT')}</p>
                            ) : (
                                <>
                                    {kind === 'quick_replies' ? <QuickRepliesForm draft={quickReplies} onChange={setQuickReplies} /> : null}
                                    {kind === 'product' ? <ProductForm draft={product} onChange={setProduct} /> : null}
                                    {kind === 'bank_transfer' ? (
                                        <BankTransferForm
                                            accountId={accountId}
                                            conversationDisplayId={conversationDisplayId}
                                            draft={bankTransfer}
                                            onChange={setBankTransfer}
                                            onPreview={setBankPreview}
                                        />
                                    ) : null}
                                    {kind === 'schedule' ? <ScheduleForm draft={schedule} onChange={setSchedule} /> : null}
                                    {showErrors && error ? (
                                        <p role="alert" className="m-0 text-sm text-n-ruby-11">
                                            {k(`ERRORS.${error}`)}
                                        </p>
                                    ) : null}
                                    <div className="mt-2 flex items-end gap-2 pt-3">
                                        <Input
                                            className="flex-1"
                                            label={k('SAVE_AS_CANNED_LABEL')}
                                            placeholder={k('SAVE_AS_CANNED_PLACEHOLDER')}
                                            value={shortCode}
                                            onChange={event => setShortCode(event.target.value)}
                                        />
                                        <NextButton
                                            type="button"
                                            slate
                                            faded
                                            icon="i-lucide-bookmark-plus"
                                            label={k('SAVE_AS_CANNED')}
                                            isLoading={isSavingCanned}
                                            disabled={!draft || Boolean(error) || isShortCodeInvalid(shortCode)}
                                            onClick={() => void saveAsCanned()}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        {preview ? <CardPreview draft={preview} /> : null}
                    </div>
            </Dialog>
        </>
    );
}

