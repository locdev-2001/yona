import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./components/ReportsWrapper', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./components/ReportHeader', () => ({ default: () => <h1>Báo cáo</h1> }));
vi.mock('./components/StatsLiveReportsContainer', () => ({ default: () => <div>Tổng quan</div> }));
vi.mock('./components/AgentLiveReportContainer', () => ({ default: () => <div>Chi tiết nhân viên</div> }));
vi.mock('./components/TeamLiveReportContainer', () => ({ default: () => <div>Chi tiết nhóm</div> }));
vi.mock('./components/heatmaps/ConversationHeatmapContainer', () => ({ default: () => <div>Biểu đồ hội thoại</div> }));
vi.mock('./components/heatmaps/ResolutionHeatmapContainer', () => ({ default: () => <div>Biểu đồ xử lý</div> }));

import LiveReports from './LiveReports';

describe('Báo cáo tinh gọn', () => {
    it('giữ tổng quan và ẩn các phần chi tiết nâng cao', () => {
        render(<LiveReports />);
        expect(screen.getByText('Tổng quan')).toBeTruthy();
        expect(screen.queryByText('Chi tiết nhân viên')).toBeNull();
        expect(screen.queryByText('Chi tiết nhóm')).toBeNull();
        expect(screen.queryByText('Biểu đồ hội thoại')).toBeNull();
        expect(screen.queryByText('Biểu đồ xử lý')).toBeNull();
    });
});
