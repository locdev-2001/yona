import { describe, expect, it } from 'vitest';

import { filterCampaigns, formatCampaigns, isPatternMatchingWithURL } from './campaignHelper';
import type { WidgetCampaign } from '../types';

// Port từ widget/helpers/specs/campaignHelper.spec.js (+ fixture campaignFixtures.js).

const campaigns: WidgetCampaign[] = [
    {
        id: 1,
        message: 'Hey, this is a campaign',
        trigger_only_during_business_hours: false,
        trigger_rules: { url: 'https://www.example.com/pricing', time_on_page: 3 },
    },
    {
        id: 2,
        message: 'Hey, this is a campaign',
        trigger_only_during_business_hours: false,
        trigger_rules: { url: 'https://www.example.com/about', time_on_page: 6 },
    },
];

describe('isPatternMatchingWithURL', () => {
    it('matches valid URL patterns', () => {
        expect(isPatternMatchingWithURL('https://example.com/pricing*', 'https://example.com/pricing/')).toBe(true);
        expect(isPatternMatchingWithURL('https://*.example.com/pricing/', 'https://app.example.com/pricing/')).toBe(
            true,
        );
        expect(
            isPatternMatchingWithURL(
                'https://{*.}?example.com/pricing?test=true',
                'https://app.example.com/pricing/?test=true',
            ),
        ).toBe(true);
        expect(
            isPatternMatchingWithURL(
                'https://{*.}?example.com/pricing*\\?*',
                'https://example.com/pricing/?test=true',
            ),
        ).toBe(true);
    });

    it('does not match a different path', () => {
        expect(isPatternMatchingWithURL('https://example.com/pricing*', 'https://example.com/about')).toBe(false);
    });
});

describe('formatCampaigns', () => {
    it('keeps only the fields the trigger rules need', () => {
        expect(formatCampaigns({ campaigns })).toStrictEqual([
            { id: 1, timeOnPage: 3, triggerOnlyDuringBusinessHours: false, url: 'https://www.example.com/pricing' },
            { id: 2, timeOnPage: 6, triggerOnlyDuringBusinessHours: false, url: 'https://www.example.com/about' },
        ]);
    });
});

describe('filterCampaigns', () => {
    const formatted = [
        { id: 1, timeOnPage: 3, url: 'https://www.example.com/pricing', triggerOnlyDuringBusinessHours: false },
        { id: 2, timeOnPage: 6, url: 'https://www.example.com/about', triggerOnlyDuringBusinessHours: false },
    ];

    it('keeps only campaigns matching the current URL', () => {
        expect(filterCampaigns({ campaigns: formatted, currentURL: 'https://www.example.com/about/' })).toStrictEqual([
            formatted[1],
        ]);
    });

    it('keeps a business-hours campaign while inside business hours', () => {
        const withBusinessHours = [formatted[0], { ...formatted[1], triggerOnlyDuringBusinessHours: true }];

        expect(
            filterCampaigns({
                campaigns: withBusinessHours,
                currentURL: 'https://www.example.com/about/',
                isInBusinessHours: true,
            }),
        ).toStrictEqual([withBusinessHours[1]]);
    });

    it('drops business-hours campaigns outside business hours', () => {
        const withBusinessHours = formatted.map(campaign => ({ ...campaign, triggerOnlyDuringBusinessHours: true }));

        expect(
            filterCampaigns({
                campaigns: withBusinessHours,
                currentURL: 'https://www.example.com/about/',
                isInBusinessHours: false,
            }),
        ).toStrictEqual([]);
    });
});
