import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import BarChart from './BarChart';

// Port từ shared/components/specs/BarChart.spec.js — bản trước mock thư viện biểu đồ viz;
// ở đây chart là component React port sẵn nên kiểm thẳng trên DOM sinh ra.

const data = {
    categories: ['20-May'],
    series: [{ id: 'conversations', data: [3] }],
};

describe('BarChart', () => {
    it('emits the clicked chart item when clickable', async () => {
        const onItemClick = vi.fn();
        render(<BarChart clickable data={data} ariaLabel="Conversations by day" onItemClick={onItemClick} />);

        const bar = screen.getByRole('button', { name: /Conversations by day|conversations, 20-May/i });
        bar.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(onItemClick).toHaveBeenCalledTimes(1);
        expect(onItemClick.mock.calls[0][0]).toMatchObject({
            pointIndex: 0,
            seriesId: 'conversations',
            seriesIndex: 0,
            categoryLabel: '20-May',
            value: 3,
        });
    });

    it('does not attach an item handler when chart is not clickable', () => {
        const onItemClick = vi.fn();
        render(<BarChart clickable={false} data={data} ariaLabel="Conversations by day" onItemClick={onItemClick} />);

        // Không clickable ⇒ nhóm cột không mang role="button" và click không gọi callback.
        expect(screen.queryByRole('button')).toBeNull();
        const chart = screen.getByRole('img', { name: 'Conversations by day' });
        chart.querySelector('.cw-viz-bar__bar-group')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(onItemClick).not.toHaveBeenCalled();
    });

    it('renders the aria label and category axis label from the data', () => {
        render(<BarChart data={data} ariaLabel="Conversations by day" />);

        expect(screen.getByRole('img', { name: 'Conversations by day' })).toBeTruthy();
        expect(screen.getByText('20-May')).toBeTruthy();
    });
});
