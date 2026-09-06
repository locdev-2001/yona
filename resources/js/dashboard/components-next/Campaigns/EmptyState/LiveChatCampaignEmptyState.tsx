import EmptyStateLayout from 'dashboard/components-next/EmptyStateLayout';

import CampaignCard from '../CampaignCard/CampaignCard';
import { ONGOING_CAMPAIGN_EMPTY_STATE_CONTENT } from './CampaignEmptyStateContent';

// Port từ components-next/Campaigns/EmptyState/LiveChatCampaignEmptyState.vue.
interface LiveChatCampaignEmptyStateProps {
    title: string;
    subtitle: string;
    className?: string;
}

export default function LiveChatCampaignEmptyState({
    title,
    subtitle,
    className = '',
}: LiveChatCampaignEmptyStateProps) {
    return (
        <EmptyStateLayout
            title={title}
            subtitle={subtitle}
            className={className}
            emptyStateItem={
                <div className="flex flex-col gap-4 p-px">
                    {ONGOING_CAMPAIGN_EMPTY_STATE_CONTENT.map(campaign => (
                        <CampaignCard
                            key={campaign.id}
                            title={campaign.title}
                            message={campaign.message}
                            isEnabled={campaign.enabled}
                            sender={campaign.sender as { id: number; name: string }}
                            inbox={campaign.inbox}
                        />
                    ))}
                </div>
            }
        />
    );
}
