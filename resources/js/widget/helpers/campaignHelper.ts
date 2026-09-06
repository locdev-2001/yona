import { URLPattern } from 'urlpattern-polyfill';

import type { WidgetCampaign, FormattedCampaign } from '../types';

// Port từ widget/helpers/campaignHelper.js — phần thuần của luật kích hoạt
// campaign (khớp URL + cửa sổ giờ làm việc). Bộ đếm thời gian ở campaignTimer.

export const isPatternMatchingWithURL = (urlPattern: string, url: string): boolean => {
    let updatedUrlPattern = urlPattern;
    const locationObj = new URL(url);

    if (updatedUrlPattern.endsWith('/')) {
        updatedUrlPattern = `${updatedUrlPattern.slice(0, -1)}*\\?*\\#*`;
    }

    if (locationObj.pathname.endsWith('/')) {
        locationObj.pathname = locationObj.pathname.slice(0, -1);
    }

    const pattern = new URLPattern(updatedUrlPattern);
    return pattern.test(locationObj.toString());
};

export const formatCampaigns = ({ campaigns }: { campaigns: WidgetCampaign[] }): FormattedCampaign[] =>
    campaigns.map(item => ({
        id: item.id,
        triggerOnlyDuringBusinessHours: item.trigger_only_during_business_hours || false,
        timeOnPage: item.trigger_rules?.time_on_page,
        url: item.trigger_rules?.url,
    }));

export const filterCampaigns = ({
    campaigns,
    currentURL,
    isInBusinessHours,
}: {
    campaigns: FormattedCampaign[];
    currentURL: string;
    isInBusinessHours?: boolean;
}): FormattedCampaign[] =>
    campaigns.filter(campaign => {
        if (!isPatternMatchingWithURL(campaign.url ?? '', currentURL)) return false;
        if (campaign.triggerOnlyDuringBusinessHours) return Boolean(isInBusinessHours);
        return true;
    });
