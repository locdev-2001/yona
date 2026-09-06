import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchDashboardApps, useDashboardApps } from './useDashboardApps';
import { getJson } from 'dashboard/helper/apiClient';

vi.mock('dashboard/helper/apiClient', () => ({ getJson: vi.fn() }));

// Port từ store/modules/specs/dashboardApps/{actions,getters}.spec.js +
// api/specs/dashboardApps.spec.js — cùng hành vi: nạp một lần cho mỗi account,
// dùng lại cache, và `force` mới nạp lại.

const RECORDS = [{ id: 1, title: 'CRM', content: [{ type: 'frame', url: 'https://link.com' }] }];

// Chờ lượt nạp đang chạy kết thúc (cờ pendingAccountId được gỡ trong `finally`).
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('fetchDashboardApps', () => {
    beforeEach(() => {
        vi.mocked(getJson).mockReset();
        vi.mocked(getJson).mockResolvedValue(RECORDS);
    });

    it('gọi đúng endpoint của account', async () => {
        fetchDashboardApps(11);
        await vi.waitFor(() => expect(getJson).toHaveBeenCalledWith('/api/v1/accounts/11/dashboard_apps'));
    });

    it('không nạp lại account đã nạp, trừ khi force', async () => {
        fetchDashboardApps(12);
        await vi.waitFor(() => expect(getJson).toHaveBeenCalledTimes(1));
        await settle();

        fetchDashboardApps(12);
        expect(getJson).toHaveBeenCalledTimes(1);

        fetchDashboardApps(12, { force: true });
        await vi.waitFor(() => expect(getJson).toHaveBeenCalledTimes(2));
    });

    it('bỏ qua accountId rỗng', () => {
        fetchDashboardApps(0);
        expect(getJson).not.toHaveBeenCalled();
    });

    it('giữ danh sách rỗng khi API trả về thứ không phải mảng', async () => {
        vi.mocked(getJson).mockResolvedValue({ payload: [] } as never);
        fetchDashboardApps(13, { force: true });
        await vi.waitFor(() => expect(getJson).toHaveBeenCalled());
    });

    it('xuất hook đọc danh sách', () => {
        expect(typeof useDashboardApps).toBe('function');
    });
});
