import { emitter } from 'shared/helpers/emitter';

import UnreadMessageList from '../components/UnreadMessageList';
import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';

// Port từ widget/views/Campaigns.vue — campaign hiện đúng khung bong bóng của
// tin chưa đọc, chỉ khác: một tin duy nhất mang campaignId và nút đóng vừa thu
// bong bóng vừa tạm ngưng campaign 1 giờ.
export default function Campaigns() {
    const campaign = useWidgetState(state => state.activeCampaign);

    const closeFullView = () => {
        if (!IFrameHelper.isIFrame()) return;
        IFrameHelper.sendMessage({ event: 'setCampaignReadOn' });
        IFrameHelper.sendMessage({ event: 'toggleBubble' });
        emitter.emit(WIDGET_BUS_EVENTS.SNOOZE_CAMPAIGNS);
    };

    return (
        <UnreadMessageList
            messages={[
                {
                    content: campaign?.message ?? '',
                    sender: campaign?.sender ?? undefined,
                    campaignId: campaign?.id,
                },
            ]}
            unreadMessageCount={0}
            onClose={closeFullView}
        />
    );
}
