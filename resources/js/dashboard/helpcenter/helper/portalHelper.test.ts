import { describe, expect, it } from 'vitest';

import { buildLocaleMenuItems, buildPortalArticleURL, buildPortalURL } from './portalHelper';

// Port từ dashboard/helper/specs/portalHelper.spec.js.
// Khác biệt cố ý: Yona không có biến cấu hình toàn cục (helpCenterURL/hostURL);
// help center chạy cùng host với dashboard nên base URL là `window.location.origin`.
describe('portalHelper', () => {
    describe('buildPortalURL', () => {
        it('trả về URL portal trên host hiện tại', () => {
            expect(buildPortalURL('handbook')).toEqual(`${window.location.origin}/hc/handbook`);
        });
    });

    describe('buildPortalArticleURL', () => {
        it('trả về URL bài viết', () => {
            expect(buildPortalArticleURL('handbook', 'culture', 'fr', 'article-slug')).toEqual(
                `${window.location.origin}/hc/handbook/articles/article-slug`,
            );
        });

        it('dùng custom domain khi có', () => {
            expect(buildPortalArticleURL('handbook', 'culture', 'fr', 'article-slug', 'custom-domain.dev')).toEqual(
                'https://custom-domain.dev/hc/handbook/articles/article-slug',
            );
        });

        it('không nhân đôi https khi custom domain đã có scheme', () => {
            expect(
                buildPortalArticleURL('handbook', 'culture', 'fr', 'article-slug', 'https://custom-domain.dev'),
            ).toEqual('https://custom-domain.dev/hc/handbook/articles/article-slug');
        });
    });

    describe('buildLocaleMenuItems', () => {
        it('locale mặc định: chỉ hai mục nội dung còn bật', () => {
            const items = buildLocaleMenuItems({ isDefault: true, isDraft: false });
            const enabledActions = ['customize-content', 'select-popular-content'];

            enabledActions.forEach(action => {
                expect(items.find(item => item.action === action)?.disabled).toBeFalsy();
            });
            expect(items.filter(item => !enabledActions.includes(item.action)).every(item => item.disabled)).toBe(true);
        });

        it('locale nháp: publish, customize, popular content, delete', () => {
            expect(buildLocaleMenuItems({ isDefault: false, isDraft: true }).map(({ action }) => action)).toEqual([
                'publish-locale',
                'customize-content',
                'select-popular-content',
                'delete',
            ]);
        });

        it('locale đang chạy: default, draft, customize, popular content, delete', () => {
            expect(buildLocaleMenuItems({ isDefault: false, isDraft: false }).map(({ action }) => action)).toEqual([
                'change-default',
                'move-to-draft',
                'customize-content',
                'select-popular-content',
                'delete',
            ]);
        });
    });
});
