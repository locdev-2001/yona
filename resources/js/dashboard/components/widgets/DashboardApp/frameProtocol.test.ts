import { describe, expect, it } from 'vitest';

import { LEGACY_DASHBOARD_APP_FETCH_INFO } from 'shared/legacyContracts';
import { DASHBOARD_APP_FETCH_INFO, isFetchInfoRequest } from './frameProtocol';

describe('app nhúng dashboard xin appContext', () => {
    it('nhận tên mới và tên đời trước', () => {
        expect(DASHBOARD_APP_FETCH_INFO).toBe('yona-dashboard-app:fetch-info');
        expect(isFetchInfoRequest(DASHBOARD_APP_FETCH_INFO)).toBe(true);
        expect(isFetchInfoRequest(LEGACY_DASHBOARD_APP_FETCH_INFO)).toBe(true);
    });

    it('bỏ qua tin khác', () => {
        expect(isFetchInfoRequest('other-app:fetch-info')).toBe(false);
        expect(isFetchInfoRequest({ event: 'fetch-info' })).toBe(false);
    });
});
