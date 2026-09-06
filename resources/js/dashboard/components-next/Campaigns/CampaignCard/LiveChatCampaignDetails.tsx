import Avatar from 'dashboard/components-next/avatar/Avatar';
import Icon from 'dashboard/components-next/icon/Icon';

import { t } from '../../../../i18n';
import type { CampaignSender } from '../types';

// Port từ components-next/Campaigns/CampaignCard/LiveChatCampaignDetails.vue.
interface LiveChatCampaignDetailsProps {
    sender?: CampaignSender | null;
    inboxName: string;
    inboxIcon: string;
}

export default function LiveChatCampaignDetails({
    sender,
    inboxName,
    inboxIcon,
}: LiveChatCampaignDetailsProps) {
    const senderName = sender?.name || t('CAMPAIGN.LIVE_CHAT.CARD.CAMPAIGN_DETAILS.BOT');

    return (
        <>
            <span className="flex-shrink-0 text-sm text-n-slate-11 whitespace-nowrap">
                {t('CAMPAIGN.LIVE_CHAT.CARD.CAMPAIGN_DETAILS.SENT_BY')}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <Avatar name={senderName} src={sender?.thumbnail} size={16} roundedFull />
                <span className="text-sm font-medium text-n-slate-12">{senderName}</span>
            </div>
            <span className="flex-shrink-0 text-sm text-n-slate-11 whitespace-nowrap">
                {t('CAMPAIGN.LIVE_CHAT.CARD.CAMPAIGN_DETAILS.FROM')}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <Icon icon={inboxIcon} className="flex-shrink-0 text-n-slate-12 size-3" />
                <span className="text-sm font-medium text-n-slate-12">{inboxName}</span>
            </div>
        </>
    );
}
