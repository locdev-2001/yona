import DOMPurify from 'dompurify';

import Button from 'dashboard/components-next/button/Button';
import CardLayout from 'dashboard/components-next/CardLayout';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { getInboxIconByType } from 'dashboard/helper/inbox';

import { t } from '../../../../i18n';
import LiveChatCampaignDetails from './LiveChatCampaignDetails';
import type { CampaignInbox, CampaignSender } from '../types';

// Port từ components-next/Campaigns/CampaignCard/CampaignCard.vue — nhánh
// isLiveChatType. Nhánh SMS/WhatsApp (SMSCampaignDetails + nút analytics) đi
// cùng kênh của chúng (E4/F5).
interface CampaignCardProps {
    title: string;
    message: string;
    isEnabled: boolean;
    sender?: CampaignSender | null;
    inbox: CampaignInbox;
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function CampaignCard({
    title,
    message,
    isEnabled,
    sender,
    inbox,
    onEdit,
    onDelete,
}: CampaignCardProps) {
    const statusLabel = isEnabled
        ? t('CAMPAIGN.LIVE_CHAT.CARD.STATUS.ENABLED')
        : t('CAMPAIGN.LIVE_CHAT.CARD.STATUS.DISABLED');

    return (
        <CardLayout layout="row">
            <div className="flex flex-col items-start justify-between flex-1 min-w-0 gap-2">
                <div className="flex justify-between gap-3 w-fit">
                    <span className="text-base font-medium capitalize text-n-slate-12 line-clamp-1">{title}</span>
                    <span
                        className={`text-xs font-medium inline-flex items-center h-6 px-2 py-0.5 rounded-md bg-n-alpha-2 ${
                            isEnabled ? 'text-n-teal-11' : 'text-n-slate-12'
                        }`}
                    >
                        {statusLabel}
                    </span>
                </div>
                <div
                    className="text-sm text-n-slate-11 line-clamp-1 [&>p]:mb-0 h-6"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(new MessageFormatter(message, false).formattedMessage),
                    }}
                />
                <div className="flex items-center w-full h-6 gap-2 overflow-hidden">
                    <LiveChatCampaignDetails
                        sender={sender}
                        inboxName={inbox?.name || ''}
                        inboxIcon={getInboxIconByType(inbox?.channel_type ?? '', 'fill')}
                    />
                </div>
            </div>
            <div className="flex items-center justify-end w-20 gap-2">
                <Button
                    variant="faded"
                    size="sm"
                    color="slate"
                    icon="i-lucide-sliders-vertical"
                    onClick={onEdit}
                />
                <Button variant="faded" color="ruby" size="sm" icon="i-lucide-trash" onClick={onDelete} />
            </div>
        </CardLayout>
    );
}
