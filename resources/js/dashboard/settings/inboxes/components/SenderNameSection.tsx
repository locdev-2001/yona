import { useState } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import SenderNameExamplePreview from './SenderNameExamplePreview';

// "Tên người gửi" của thư gửi khách. Nút Lưu cạnh ô tên doanh nghiệp chỉ lưu tên
// doanh nghiệp (onSaveBusinessName), không lưu các ô khác đang sửa dở của trang.
interface SenderNameSectionProps {
    senderNameType: string;
    businessName: string;
    inboxName: string;
    agentName: string;
    emailAddress: string;
    isSavingBusinessName: boolean;
    onSenderNameTypeChange: (type: string) => void;
    onBusinessNameChange: (name: string) => void;
    onSaveBusinessName: () => Promise<boolean>;
}

export default function SenderNameSection({
    senderNameType,
    businessName,
    inboxName,
    agentName,
    emailAddress,
    isSavingBusinessName,
    onSenderNameTypeChange,
    onBusinessNameChange,
    onSaveBusinessName,
}: SenderNameSectionProps) {
    const [isEditingBusinessName, setEditingBusinessName] = useState(false);

    const saveBusinessName = async () => {
        if (await onSaveBusinessName()) setEditingBusinessName(false);
    };

    return (
        <div className="flex flex-col gap-3 w-full min-w-0">
            <div className="flex flex-col gap-1">
                <span className="text-heading-3 text-n-slate-12">
                    {t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.TITLE')}
                </span>
                <span className="text-body-main text-n-slate-11">
                    {t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.SUB_TEXT')}
                </span>
            </div>
            <SenderNameExamplePreview
                senderNameType={senderNameType}
                businessName={businessName || inboxName}
                agentName={agentName}
                emailAddress={emailAddress}
                onUpdate={onSenderNameTypeChange}
            />
            {isEditingBusinessName ? (
                <form
                    className="flex flex-wrap items-center gap-2 w-full"
                    onSubmit={event => {
                        event.preventDefault();
                        void saveBusinessName();
                    }}
                >
                    <input
                        autoFocus
                        value={businessName}
                        aria-label={t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.BUSINESS_NAME.PLACEHOLDER')}
                        placeholder={t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.BUSINESS_NAME.PLACEHOLDER')}
                        className="!mb-0 flex-1 min-w-0"
                        maxLength={255}
                        type="text"
                        onChange={event => onBusinessNameChange(event.target.value)}
                    />
                    <Button
                        type="submit"
                        label={t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.BUSINESS_NAME.SAVE_BUTTON_TEXT')}
                        className="flex-shrink-0"
                        isLoading={isSavingBusinessName}
                    />
                </form>
            ) : (
                <div>
                    <Button
                        ghost
                        blue
                        sm
                        label={t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.BUSINESS_NAME.BUTTON_TEXT')}
                        onClick={() => setEditingBusinessName(true)}
                    />
                </div>
            )}
        </div>
    );
}
