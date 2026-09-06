import type { FormattedCampaign } from '../types';

// Port từ widget/helpers/campaignTimer.js — mỗi campaign khớp URL được hẹn giờ
// theo `time_on_page`; đổi trang thì hẹn lại từ đầu. Bản gốc dispatch thẳng vào
// store Vuex; ở đây nhận callback nên helper không biết gì về store.
class CampaignTimer {
    private timers = new Map<number, ReturnType<typeof setTimeout>>();

    initTimers(campaigns: FormattedCampaign[], onTimeout: (campaignId: number) => void): void {
        this.clearTimers();
        campaigns.forEach(campaign => {
            this.timers.set(
                campaign.id,
                setTimeout(() => onTimeout(campaign.id), (campaign.timeOnPage ?? 0) * 1000),
            );
        });
    }

    clearTimers(): void {
        this.timers.forEach(timerId => clearTimeout(timerId));
        this.timers.clear();
    }
}

export const campaignTimer = new CampaignTimer();
