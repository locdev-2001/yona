import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import CsatMetrics from './CsatMetrics';
import * as api from '../api';
import { fetchCsatMetrics, resetCsatStore } from '../csatStore';
import { t } from '../../../i18n';

// Port từ reports/components/specs/CSATMetrics.spec.js — bản gốc nhồi getter vuex,
// ở đây nhồi qua chính store module (một nguồn duy nhất như mã chạy thật).

async function seedMetrics(): Promise<void> {
    vi.spyOn(api, 'getCsatMetrics').mockResolvedValue({
        total_count: 100,
        ratings_count: { 1: 10, 2: 20, 3: 30, 4: 30, 5: 10 },
        total_sent_messages_count: 200,
    });
    await fetchCsatMetrics(1, { from: 0, to: 0 });
}

describe('CsatMetrics', () => {
    beforeEach(() => {
        resetCsatStore();
        vi.restoreAllMocks();
    });

    it('shows the response count, satisfaction score and response rate', async () => {
        await seedMetrics();
        render(<CsatMetrics />);

        expect(screen.getByText('100')).toBeTruthy();
        // (30 + 10) / 100 * 100 và 100 / 200 * 100, hai chữ số thập phân như bản gốc.
        expect(screen.getByText('40.00%')).toBeTruthy();
        expect(screen.getByText('50.00%')).toBeTruthy();
    });

    it('renders three metric cards and the rating distribution', async () => {
        await seedMetrics();
        const { container } = render(<CsatMetrics />);

        expect(container.querySelectorAll('.min-w-\\[10rem\\]')).toHaveLength(3);
        expect(screen.getByText(t('CSAT_REPORTS.METRIC.RATING_DISTRIBUTION'))).toBeTruthy();
    });

    it('falls back to zero when there is no response', () => {
        render(<CsatMetrics />);

        expect(screen.getByText('0')).toBeTruthy();
        expect(screen.getAllByText('0%')).toHaveLength(2);
    });
});
