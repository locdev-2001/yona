import { t } from '../../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import RadioCard from 'dashboard/components-next/radioCard/RadioCard';

// Hai kiểu tên người gửi, mỗi kiểu kèm ví dụ dựng từ dữ liệu thật: tên nhân viên
// đang đăng nhập, tên doanh nghiệp (trống thì là tên hộp thư, như lúc gửi thư) và
// địa chỉ thư sẽ gửi cho khách.
interface SenderNameExamplePreviewProps {
    senderNameType: string;
    businessName: string;
    agentName: string;
    emailAddress: string;
    onUpdate: (key: string) => void;
}

export default function SenderNameExamplePreview({
    senderNameType,
    businessName,
    agentName,
    emailAddress,
    onUpdate,
}: SenderNameExamplePreviewProps) {
    const senderNameKeyOptions = [
        {
            key: 'friendly',
            heading: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.FRIENDLY.TITLE'),
            content: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.FRIENDLY.SUBTITLE'),
            avatarName: agentName,
        },
        {
            key: 'professional',
            heading: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.PROFESSIONAL.TITLE'),
            content: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.PROFESSIONAL.SUBTITLE'),
            avatarName: businessName,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            {senderNameKeyOptions.map(keyOption => {
                const isFriendly = keyOption.key === 'friendly';

                return (
                    <RadioCard
                        id={`sender-name-${keyOption.key}`}
                        key={keyOption.key}
                        label={keyOption.heading}
                        description={keyOption.content}
                        isActive={keyOption.key === senderNameType}
                        className="min-w-0 !gap-2"
                        onSelect={() => onUpdate(keyOption.key)}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={keyOption.avatarName} size={30} />
                            <div className="flex flex-col min-w-0">
                                <div className="flex flex-wrap items-center gap-x-1 text-body-main">
                                    {isFriendly ? (
                                        <>
                                            <span className="text-n-slate-12">{agentName}</span>
                                            <span className="text-n-slate-11">
                                                {t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.FRIENDLY.FROM')}
                                            </span>
                                        </>
                                    ) : null}
                                    <span className="text-n-slate-12">{businessName}</span>
                                </div>
                                <span className="text-label-small text-n-slate-11 break-all">{`<${emailAddress}>`}</span>
                            </div>
                        </div>
                    </RadioCard>
                );
            })}
        </div>
    );
}
