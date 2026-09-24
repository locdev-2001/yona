import { useState } from 'react';

import { t } from '../../../../i18n';
import ChannelSelector from 'dashboard/components/ChannelSelector';
import CloudWhatsappChannelForm from './CloudWhatsapp';
import ThreeSixtyDialogWhatsappChannelForm from './ThreeSixtyDialogWhatsapp';
import TwilioChannelForm from './Twilio';

// Port từ settings/inbox/channels/Whatsapp.vue — bước chọn nhà cung cấp rồi form
// cấu hình. Nhánh embedded signup (chỉ chạy khi có whatsappAppId của Meta) và các
// banner giới hạn của bản cloud không làm — xem note.
const PROVIDER_TYPES = {
    WHATSAPP: 'whatsapp',
    TWILIO: 'twilio',
    THREE_SIXTY_DIALOG: '360dialog',
} as const;

function providerFromUrl(): string {
    return new URLSearchParams(window.location.search).get('provider') ?? '';
}

export default function WhatsappChannelForm() {
    const [selectedProvider, setSelectedProvider] = useState(providerFromUrl);

    const availableProviders = [
        {
            key: PROVIDER_TYPES.WHATSAPP,
            title: t('INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.WHATSAPP_CLOUD'),
            description: t('INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.WHATSAPP_CLOUD_DESC'),
            icon: 'i-woot-whatsapp',
        },
        {
            key: PROVIDER_TYPES.TWILIO,
            title: t('INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.TWILIO'),
            description: t('INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.TWILIO_DESC'),
            icon: 'i-woot-twilio',
        },
    ];

    // Bản gốc đẩy provider vào query của router; giữ nguyên hình dạng URL để nút
    // back của trình duyệt hoạt động như oracle.
    const selectProvider = (provider: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set('provider', provider);
        window.history.pushState({}, '', url);
        setSelectedProvider(provider);
    };

    if (!selectedProvider) {
        return (
            <div className="overflow-auto col-span-6 p-6 w-full h-full">
                <div>
                    <div className="mb-10 text-left">
                        <h1 className="mb-2 text-lg font-medium text-n-slate-12">
                            {t('INBOX_MGMT.ADD.WHATSAPP.SELECT_PROVIDER.TITLE')}
                        </h1>
                        <p className="text-sm leading-relaxed text-n-slate-11">
                            {t('INBOX_MGMT.ADD.WHATSAPP.SELECT_PROVIDER.DESCRIPTION')}
                        </p>
                    </div>

                    <div className="flex gap-6 justify-start">
                        {availableProviders.map(provider => (
                            <ChannelSelector
                                key={provider.key}
                                title={provider.title}
                                description={provider.description}
                                icon={provider.icon}
                                onClick={() => selectProvider(provider.key)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-auto col-span-6 p-6 w-full h-full">
            <div>
                <div className="px-6 py-5 rounded-2xl border border-n-weak">
                    {selectedProvider === PROVIDER_TYPES.TWILIO ? (
                        <TwilioChannelForm type="whatsapp" />
                    ) : selectedProvider === PROVIDER_TYPES.THREE_SIXTY_DIALOG ? (
                        <ThreeSixtyDialogWhatsappChannelForm />
                    ) : (
                        <CloudWhatsappChannelForm />
                    )}
                </div>
            </div>
        </div>
    );
}
