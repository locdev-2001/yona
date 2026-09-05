import { t } from '../../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import RadioCard from 'dashboard/components-next/radioCard/RadioCard';
import { useBranding } from 'shared/composables/useBranding';

// Port từ settings/inbox/components/SenderNameExamplePreview.vue
interface SenderNameExamplePreviewProps {
    senderNameType: string;
    businessName: string;
    isWebsiteChannel?: boolean;
    onUpdate: (key: string) => void;
}

export default function SenderNameExamplePreview({
    senderNameType,
    businessName,
    isWebsiteChannel = false,
    onUpdate,
}: SenderNameExamplePreviewProps) {
    const { replaceInstallationName } = useBranding();

    const senderNameKeyOptions = [
        {
            key: 'friendly',
            heading: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.FRIENDLY.TITLE'),
            content: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.FRIENDLY.SUBTITLE'),
            preview: {
                senderName: 'Smith',
                businessName: replaceInstallationName('Chatwoot'),
                email: '<support@yourbusiness.com>',
            },
        },
        {
            key: 'professional',
            heading: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.PROFESSIONAL.TITLE'),
            content: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.PROFESSIONAL.SUBTITLE'),
            preview: {
                senderName: '',
                businessName: replaceInstallationName('Chatwoot'),
                email: '<support@yourbusiness.com>',
            },
        },
    ];

    return (
        <div
            className={`flex flex-col items-start gap-4 mt-3 min-w-0 ${
                isWebsiteChannel ? 'sm:flex-row md:flex-col xl:flex-row' : 'sm:flex-row'
            }`}
        >
            {senderNameKeyOptions.map(keyOption => {
                const isFriendly = keyOption.key === 'friendly';
                const userName = isFriendly
                    ? keyOption.preview.senderName
                    : businessName || keyOption.preview.businessName;

                return (
                    <RadioCard
                        id={keyOption.key}
                        key={keyOption.key}
                        label={keyOption.heading}
                        description={keyOption.content}
                        isActive={keyOption.key === senderNameType}
                        className="flex-1 !gap-2"
                        onSelect={onUpdate}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar name={userName} size={30} />
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    {isFriendly ? (
                                        <span className="text-body-main text-n-slate-12">
                                            {keyOption.preview.senderName}
                                        </span>
                                    ) : null}
                                    {isFriendly ? (
                                        <span className="text-body-main text-n-slate-11">
                                            {t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.FRIENDLY.FROM')}
                                        </span>
                                    ) : null}
                                    <span className="text-body-main text-n-slate-12">
                                        {businessName || keyOption.preview.businessName}
                                    </span>
                                </div>
                                <span className="text-label-small text-n-slate-11">
                                    {keyOption.preview.email}
                                </span>
                            </div>
                        </div>
                    </RadioCard>
                );
            })}
        </div>
    );
}
