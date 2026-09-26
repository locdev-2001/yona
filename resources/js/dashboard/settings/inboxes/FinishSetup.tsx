import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import QRCode from 'qrcode';

import { t } from '../../../i18n';
import { getJson } from 'dashboard/helper/apiClient';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import WizardLayout, { INBOX_WIZARD_ROUTES } from './WizardLayout';
import Code from 'dashboard/components/Code';
import EmptyState from 'dashboard/components/widgets/EmptyState';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../types';
import EmailInboxFinish from './channels/EmailInboxFinish';
import type { Inbox } from './types';

// Port từ settings/inbox/FinishSetup.vue.
interface FinishSetupProps {
    inboxId: number;
}

// platformUrls của generateQRCode gốc.
const QR_PLATFORM_URL: Record<string, (identifier: string) => string> = {
    whatsapp: id => `https://wa.me/${id}`,
    messenger: id => `https://m.me/${id}`,
    telegram: id => `https://t.me/${id}`,
};

function useChannelQrCode(platform: string, identifier: string | null | undefined): string {
    const [dataUrl, setDataUrl] = useState('');

    useEffect(() => {
        if (!identifier || !identifier.trim()) {
            setDataUrl('');

            return;
        }

        QRCode.toDataURL(QR_PLATFORM_URL[platform](identifier))
            .then(setDataUrl)
            .catch(() => setDataUrl(''));
    }, [platform, identifier]);

    return dataUrl;
}

// Khối QR của WhatsApp/Messenger dùng gap-3, của Telegram dùng gap-4 (đúng bản gốc).
function QrCodeBlock({
    instruction,
    dataUrl,
    alt,
    gapClass = 'gap-3',
}: {
    instruction: string;
    dataUrl: string;
    alt: string;
    gapClass?: string;
}) {
    if (!dataUrl) return null;

    return (
        <div className={`flex flex-col ${gapClass} items-center mt-8`}>
            <p className="mt-2 text-sm text-n-slate-9">{instruction}</p>
            <div className="rounded-lg shadow outline-1 outline-n-strong outline">
                <img src={dataUrl} alt={alt} className="rounded-lg size-48" />
            </div>
        </div>
    );
}

export default function FinishSetup({ inboxId }: FinishSetupProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [inbox, setInbox] = useState<Inbox | null>(null);

    useEffect(() => {
        void getJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`).then(setInbox);
    }, [accountId, inboxId]);

    const channelType = inbox?.channel_type;
    const isTwilio = channelType === INBOX_TYPES.TWILIO;
    const isTwilioWhatsapp = isTwilio && inbox?.medium === 'whatsapp';
    const isSmsInbox = channelType === INBOX_TYPES.SMS || (isTwilio && inbox?.medium === 'sms');
    const isLine = channelType === INBOX_TYPES.LINE;
    const isTelegram = channelType === INBOX_TYPES.TELEGRAM;
    const isFacebook = channelType === INBOX_TYPES.FB;
    const isWhatsapp = channelType === INBOX_TYPES.WHATSAPP || isTwilioWhatsapp;
    const isWhatsappCloud = channelType === INBOX_TYPES.WHATSAPP && inbox?.provider === 'whatsapp_cloud';
    // provider_config.source === 'embedded_signup' là luồng chưa port, nên mọi
    // kênh Cloud đều hiện khối webhook để người dùng khai báo tay.
    const showWhatsappWebhookDetails = isWhatsappCloud;

    const whatsappQr = useChannelQrCode('whatsapp', isWhatsapp ? inbox?.phone_number?.replace('whatsapp:', '') : null);
    const messengerQr = useChannelQrCode('messenger', isFacebook ? inbox?.page_id : null);
    const telegramQr = useChannelQrCode('telegram', isTelegram ? inbox?.bot_name : null);

    const webWidgetScript = inbox?.web_widget_script ?? '';
    // isAnEmailChannel && !provider của bản gốc: màn Voilà không có dòng mô tả
    // chung, EmailInboxFinish tự viết lời nhắn theo forwarding_enabled.
    const isEmailFinish = channelType === INBOX_TYPES.EMAIL && !inbox?.provider;

    const message = isEmailFinish
        ? ''
        : isTwilio
          ? `${t('INBOX_MGMT.FINISH.MESSAGE')}. ${t('INBOX_MGMT.ADD.TWILIO.API_CALLBACK.SUBTITLE')}`
          : isSmsInbox
            ? `${t('INBOX_MGMT.FINISH.MESSAGE')}. ${t('INBOX_MGMT.ADD.SMS.BANDWIDTH.API_CALLBACK.SUBTITLE')}`
            : isLine
              ? `${t('INBOX_MGMT.FINISH.MESSAGE')}. ${t('INBOX_MGMT.ADD.LINE_CHANNEL.API_CALLBACK.SUBTITLE')}`
              : showWhatsappWebhookDetails
                ? `${t('INBOX_MGMT.FINISH.MESSAGE')}. ${t('INBOX_MGMT.ADD.WHATSAPP.API_CALLBACK.SUBTITLE')}`
                : webWidgetScript
                  ? t('INBOX_MGMT.FINISH.WEBSITE_SUCCESS')
                  : t('INBOX_MGMT.FINISH.MESSAGE');

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.FINISH}>
                    <div className="overflow-auto col-span-6 p-6 w-full h-full">
                        <EmptyState title={t('INBOX_MGMT.FINISH.TITLE')} message={message}>
                            <div className="w-full text-center">
                                <div className="my-4 mx-auto max-w-[70%]">
                                    {webWidgetScript ? <Code script={webWidgetScript} /> : null}
                                </div>
                                <div className="w-[50%] max-w-[50%] ml-[25%]">
                                    {isTwilioWhatsapp ? (
                                        <Code lang="html" script={inbox?.callback_webhook_url ?? ''} />
                                    ) : null}
                                </div>
                                {showWhatsappWebhookDetails ? (
                                    <div className="w-[50%] max-w-[50%] ml-[25%]">
                                        <p className="mt-8 font-medium text-n-slate-11">
                                            {t('INBOX_MGMT.ADD.WHATSAPP.API_CALLBACK.WEBHOOK_URL')}
                                        </p>
                                        <Code lang="html" script={inbox?.callback_webhook_url ?? ''} />
                                        <p className="mt-8 font-medium text-n-slate-11">
                                            {t('INBOX_MGMT.ADD.WHATSAPP.API_CALLBACK.WEBHOOK_VERIFICATION_TOKEN')}
                                        </p>
                                        <Code
                                            lang="html"
                                            script={String(inbox?.provider_config?.webhook_verify_token ?? '')}
                                        />
                                    </div>
                                ) : null}
                                <div className="w-[50%] max-w-[50%] ml-[25%]">
                                    {isLine ? <Code lang="html" script={inbox?.callback_webhook_url ?? ''} /> : null}
                                </div>
                                <div className="w-[50%] max-w-[50%] ml-[25%]">
                                    {isSmsInbox ? (
                                        <Code lang="html" script={inbox?.callback_webhook_url ?? ''} />
                                    ) : null}
                                </div>
                                {isEmailFinish && inbox ? (
                                    <EmailInboxFinish inbox={inbox} inboxId={inboxId} accountId={accountId} />
                                ) : null}
                                {isWhatsapp ? (
                                    <QrCodeBlock
                                        instruction={t('INBOX_MGMT.FINISH.WHATSAPP_QR_INSTRUCTION')}
                                        dataUrl={whatsappQr}
                                        alt="WhatsApp QR Code"
                                    />
                                ) : null}
                                {isFacebook ? (
                                    <QrCodeBlock
                                        instruction={t('INBOX_MGMT.FINISH.MESSENGER_QR_INSTRUCTION')}
                                        dataUrl={messengerQr}
                                        alt="Messenger QR Code"
                                    />
                                ) : null}
                                {isTelegram ? (
                                    <QrCodeBlock
                                        instruction={t('INBOX_MGMT.FINISH.TELEGRAM_QR_INSTRUCTION')}
                                        dataUrl={telegramQr}
                                        alt="Telegram QR Code"
                                        gapClass="gap-4"
                                    />
                                ) : null}
                                <div className="flex gap-2 justify-center mt-4">
                                    <a href={accountScopedUrl(accountId, `settings/inboxes/${inboxId}`)}>
                                        <Button outline slate label={t('INBOX_MGMT.FINISH.MORE_SETTINGS')} />
                                    </a>
                                    <a href={accountScopedUrl(accountId, `inbox/${inboxId}`)}>
                                        <Button solid teal label={t('INBOX_MGMT.FINISH.BUTTON_TEXT')} />
                                    </a>
                                </div>
                            </div>
                        </EmptyState>
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
