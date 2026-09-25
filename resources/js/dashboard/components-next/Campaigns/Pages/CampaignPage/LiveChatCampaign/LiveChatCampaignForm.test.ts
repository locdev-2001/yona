import { describe, expect, it } from 'vitest';

import { campaignFormErrors } from './LiveChatCampaignForm';

const valid = {
    title: 'Mời xem hàng mới',
    message: 'Shop đang online nè',
    inboxId: 1,
    senderId: 0,
    enabled: true,
    triggerOnlyDuringBusinessHours: false,
    endPoint: 'https://gommoc.vn/*',
    timeOnPage: '10',
    quickReplies: ['Còn hàng không?', '', ''],
    showTo: 'new' as const,
};

describe('chip trả lời nhanh của lời mời', () => {
    it('ô trống được bỏ qua; chip trùng hoặc quá 40 ký tự thì báo lỗi', () => {
        expect(campaignFormErrors(valid)).toEqual({});
        expect(campaignFormErrors({ ...valid, quickReplies: ['Phí ship?', ' Phí ship? ', ''] })).toHaveProperty('quickReplies');
        expect(campaignFormErrors({ ...valid, quickReplies: ['x'.repeat(41), '', ''] })).toHaveProperty('quickReplies');
    });
});
