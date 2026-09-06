import { describe, expect, it } from 'vitest';

import {
    clampDataBetweenTimeline,
    flattenHeatmapData,
    groupHeatmapByDay,
    reconcileHeatmapData,
    type HeatmapPoint,
} from './reportsDataHelper';

// Port từ shared/helpers/specs/ReportsDataHelper.spec.js (toMatchInlineSnapshot
// đổi thành so khớp tường minh vì snapshot phụ thuộc múi giờ chạy test).

describe('flattenHeatmapData', () => {
    it('should flatten heatmap data to key-value pairs', () => {
        const data = [
            { timestamp: 1614265200, value: 10 },
            { timestamp: 1614308400, value: 20 },
        ];
        expect(flattenHeatmapData(data)).toEqual({ 1614265200: 10, 1614308400: 20 });
    });

    it('should handle empty data', () => {
        expect(flattenHeatmapData([])).toEqual({});
    });

    it('should handle data with same timestamps', () => {
        const data = [
            { timestamp: 1614265200, value: 10 },
            { timestamp: 1614265200, value: 20 },
        ];
        expect(flattenHeatmapData(data)).toEqual({ 1614265200: 20 });
    });
});

describe('reconcileHeatmapData', () => {
    it('should reconcile heatmap data with new data', () => {
        const data = [
            { timestamp: 1614265200, value: 10 },
            { timestamp: 1614308400, value: 20 },
        ];
        const heatmapData = [
            { timestamp: 1614265200, value: 5 },
            { timestamp: 1614308400, value: 15 },
            { timestamp: 1614387600, value: 25 },
        ];
        expect(reconcileHeatmapData(data, heatmapData)).toEqual([
            { timestamp: 1614265200, value: 10 },
            { timestamp: 1614308400, value: 20 },
            { timestamp: 1614387600, value: 25 },
        ]);
    });

    it('should reconcile heatmap data with new data and handle missing data', () => {
        const data = [{ timestamp: 1614308400, value: 20 }];
        const heatmapData = [
            { timestamp: 1614265200, value: 5 },
            { timestamp: 1614308400, value: 15 },
            { timestamp: 1614387600, value: 25 },
        ];
        expect(reconcileHeatmapData(data, heatmapData)).toEqual([
            { timestamp: 1614265200, value: 5 },
            { timestamp: 1614308400, value: 20 },
            { timestamp: 1614387600, value: 25 },
        ]);
    });

    it('should replace empty heatmap data with a new array', () => {
        const data = [{ timestamp: 1614308400, value: 20 }];
        expect(reconcileHeatmapData(data, []).length).toEqual(7 * 24);
    });
});

describe('groupHeatmapByDay', () => {
    it('should group heatmap data by day', () => {
        const heatmapData: HeatmapPoint[] = [
            { timestamp: 1614265200, value: 10 },
            { timestamp: 1614308400, value: 20 },
            { timestamp: 1614387600, value: 30 },
            { timestamp: 1614430800, value: 40 },
            { timestamp: 1614499200, value: 50 },
        ];

        const grouped = groupHeatmapByDay(heatmapData);
        const flattened = [...grouped.values()].flat();

        expect([...grouped.keys()].length).toBe(4);
        expect(flattened.map(item => item.timestamp)).toEqual([
            1614265200, 1614308400, 1614387600, 1614430800, 1614499200,
        ]);
        flattened.forEach(item => {
            expect(item.hour).toBe(new Date(item.timestamp * 1000).getHours());
            expect(item.date.getTime()).toBe(item.timestamp * 1000);
        });
    });

    it('should group empty heatmap data by day', () => {
        expect(groupHeatmapByDay([])).toEqual(new Map());
    });

    it('should group heatmap data with same timestamp in the same day', () => {
        const heatmapData: HeatmapPoint[] = [
            { timestamp: 1614265200, value: 10 },
            { timestamp: 1614265200, value: 20 },
        ];

        const grouped = groupHeatmapByDay(heatmapData);
        expect([...grouped.keys()].length).toBe(1);
        expect([...grouped.values()][0].map(item => item.value)).toEqual([10, 20]);
    });
});

describe('clampDataBetweenTimeline', () => {
    const data = [
        { timestamp: 1646054400, value: 0 },
        { timestamp: 1646054500, value: 1 },
        { timestamp: 1646054600, value: 2 },
        { timestamp: 1646054700, value: 3 },
        { timestamp: 1646054800, value: 4 },
    ];

    it('should return empty array if data is empty', () => {
        expect(clampDataBetweenTimeline([], 1646054500, 1646054700)).toEqual([]);
    });

    it('should return empty array if no data is within the timeline', () => {
        expect(clampDataBetweenTimeline(data, 1646054900, 1646055000)).toEqual([]);
    });

    it('should return the data as is no time limits are provided', () => {
        expect(clampDataBetweenTimeline(data)).toEqual(data);
    });

    it('should return all data if all data is within the timeline', () => {
        expect(clampDataBetweenTimeline(data, 1646054300, 1646054900)).toEqual(data);
    });

    it('should return only data within the timeline', () => {
        expect(clampDataBetweenTimeline(data, 1646054500, 1646054700)).toEqual([
            { timestamp: 1646054500, value: 1 },
            { timestamp: 1646054600, value: 2 },
        ]);
    });

    it('should return empty array if from and to are the same', () => {
        expect(clampDataBetweenTimeline(data, 1646054500, 1646054500)).toEqual([]);
    });
});
