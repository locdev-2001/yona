import { t } from '../../../../../../i18n';
import LiveChatCampaignForm from './LiveChatCampaignForm';
import type { LiveChatCampaignPayload } from '../../../types';

// Port từ components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/LiveChatCampaignDialog.vue
// — bảng bung ra dưới nút "Create campaign" (không phải <dialog>).
interface LiveChatCampaignDialogProps {
    isCreating: boolean;
    onSubmit: (payload: LiveChatCampaignPayload) => void;
    onClose: () => void;
}

export default function LiveChatCampaignDialog({ isCreating, onSubmit, onClose }: LiveChatCampaignDialogProps) {
    return (
        <div className="w-[25rem] z-50 min-w-0 absolute top-10 ltr:right-0 rtl:left-0 bg-n-alpha-3 backdrop-blur-[100px] p-6 rounded-xl border border-n-weak shadow-md flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-medium text-n-slate-12">{t('CAMPAIGN.LIVE_CHAT.CREATE.TITLE')}</h3>
            <LiveChatCampaignForm
                mode="create"
                isCreating={isCreating}
                onSubmit={payload => {
                    onSubmit(payload);
                    onClose();
                }}
                onCancel={onClose}
            />
        </div>
    );
}
