import { useState } from 'react';
import type { FormEvent } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';
import { resolveStructured, StructuredMessageView } from 'shared/messaging';
import { isShortCodeInvalid } from 'dashboard/composables/useCannedResponses';
import type { CannedResponse } from 'dashboard/composables/useCannedResponses';
import { CARD_KIND_BY_CONTENT_TYPE } from 'dashboard/conversation/composer/SendCardMenu/cardPayloads';
import { useCannedCardPreview } from 'dashboard/conversation/composer/SendCardMenu/SendCardMenu';
import { t } from '../../../i18n';

// Câu trả lời mẫu mang thẻ (content_type khác rỗng): không mở lại form JSON,
// chỉ đổi được mã tắt ở đây — đổi nội dung thẻ thì gửi lại từ hội thoại rồi
// "Lưu làm câu trả lời mẫu" (xem SendCardMenu.tsx).
interface CardCannedViewProps {
    accountId: number;
    record: CannedResponse;
    isSubmitting: boolean;
    onSubmit: (shortCode: string) => void;
    onClose: () => void;
}

export default function CardCannedView({ accountId, record, isSubmitting, onSubmit, onClose }: CardCannedViewProps) {
    const [shortCode, setShortCode] = useState(record.short_code);
    const [isTouched, setTouched] = useState(false);
    const shortCodeError = isTouched && isShortCodeInvalid(shortCode);

    const kind = record.content_type ? CARD_KIND_BY_CONTENT_TYPE[record.content_type] : undefined;
    const typeLabel = kind
        ? t(`CONVERSATION.SEND_CARD.${kind.toUpperCase()}.TITLE`)
        : t('CANNED_MGMT.LIST.UNKNOWN_CARD_TYPE');

    // Thẻ chuyển khoản chỉ lưu payment_account_id/amount/memo — tự tra lại số
    // tài khoản thật để StructuredMessageView có đủ dữ liệu vẽ thẻ, cùng đường
    // dùng khi nhân viên chọn câu trả lời mẫu này trong hộp thư.
    const cannedCard = record.content_type
        ? { contentType: record.content_type, content: record.content ?? null, contentAttributes: record.content_attributes ?? {} }
        : null;
    const preview = useCannedCardPreview(accountId, cannedCard);
    const resolved = preview ? resolveStructured({ id: record.id, message_type: 1, content: preview.content ?? null, content_type: preview.contentType, content_attributes: preview.contentAttributes }) : null;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit(shortCode);
    };

    return (
        <Modal show onClose={onClose}>
            <div className="flex flex-col h-auto overflow-auto">
                <ModalHeader headerTitle={`${t('CANNED_MGMT.EDIT.TITLE')} - ${record.short_code}`} />
                <form className="flex flex-col w-full gap-4 px-4 pb-4" onSubmit={submit}>
                    <div className="w-full">
                        <label className={shortCodeError ? 'error' : undefined}>
                            {t('CANNED_MGMT.EDIT.FORM.SHORT_CODE.LABEL')}
                            <input
                                type="text"
                                value={shortCode}
                                placeholder={t('CANNED_MGMT.EDIT.FORM.SHORT_CODE.PLACEHOLDER')}
                                onChange={event => {
                                    setShortCode(event.target.value);
                                    setTouched(true);
                                }}
                                onBlur={() => setTouched(true)}
                            />
                        </label>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-n-slate-12">{t('CANNED_MGMT.EDIT.CARD_VIEW.TYPE_LABEL')}</span>
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-n-alpha-2 px-2 py-0.5 text-xs font-medium text-n-slate-11">
                            <span className="i-lucide-layout-panel-top size-3" />
                            {typeLabel}
                        </span>
                    </div>
                    {resolved ? (
                        <div className="rounded-xl bg-n-alpha-1 p-3">
                            <StructuredMessageView
                                resolved={resolved}
                                message={{ id: record.id, message_type: 1, content: preview?.content ?? null, content_type: preview?.contentType ?? null, content_attributes: preview?.contentAttributes ?? {} }}
                            />
                        </div>
                    ) : null}
                    <p className="m-0 text-sm text-n-slate-11">{t('CANNED_MGMT.EDIT.CARD_VIEW.HINT')}</p>
                    <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
                        <Button faded slate type="button" label={t('CANNED_MGMT.EDIT.CANCEL_BUTTON_TEXT')} onClick={onClose} />
                        <Button
                            type="submit"
                            label={t('CANNED_MGMT.EDIT.FORM.SUBMIT')}
                            disabled={isShortCodeInvalid(shortCode) || isSubmitting}
                            isLoading={isSubmitting}
                        />
                    </div>
                </form>
            </div>
        </Modal>
    );
}
