import CampaignCard from '../../CampaignCard/CampaignCard';
import type { Campaign, CampaignSender } from '../../types';

// Port từ components-next/Campaigns/Pages/CampaignPage/CampaignList.vue
// (nhánh analytics WhatsApp là EE nên không port).
interface CampaignListProps {
    campaigns: Campaign[];
    onEdit: (campaign: Campaign) => void;
    onDelete: (campaign: Campaign) => void;
}

const senderOf = (campaign: Campaign): CampaignSender | null =>
    campaign.sender && 'id' in campaign.sender ? (campaign.sender as CampaignSender) : null;

export default function CampaignList({ campaigns, onEdit, onDelete }: CampaignListProps) {
    return (
        <div className="flex flex-col gap-4">
            {campaigns.map(campaign => (
                <CampaignCard
                    key={campaign.id}
                    title={campaign.title}
                    message={campaign.message}
                    isEnabled={campaign.enabled}
                    sender={senderOf(campaign)}
                    inbox={campaign.inbox}
                    onEdit={() => onEdit(campaign)}
                    onDelete={() => onDelete(campaign)}
                />
            ))}
        </div>
    );
}
