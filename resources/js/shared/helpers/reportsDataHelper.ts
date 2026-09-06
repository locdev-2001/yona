import { endOfDay, fromUnixTime, getUnixTime, startOfDay, subDays } from 'date-fns';

// Port từ shared/helpers/ReportsDataHelper.js.

export interface HeatmapPoint {
    timestamp: number;
    value: number;
    [key: string]: unknown;
}

export interface GroupedHeatmapPoint extends HeatmapPoint {
    date: Date;
    hour: number;
}

export function flattenHeatmapData(data: HeatmapPoint[]): Record<number, number> {
    return data.reduce<Record<number, number>>((accumulator, current) => {
        accumulator[current.timestamp] = current.value;
        return accumulator;
    }, {});
}

export function clampDataBetweenTimeline<T extends { timestamp: number }>(
    data: T[],
    from?: number,
    to?: number,
): T[] {
    if (from === undefined && to === undefined) {
        return data;
    }

    return data.filter(element => {
        const { timestamp } = element;

        const isWithinFrom = from === undefined || timestamp - from >= 0;
        const isWithinTo = to === undefined || to - timestamp > 0;

        return isWithinFrom && isWithinTo;
    });
}

export function generateEmptyHeatmapData(): HeatmapPoint[] {
    const data: HeatmapPoint[] = [];
    const today = new Date();

    let timeMarker = getUnixTime(startOfDay(subDays(today, 6)));
    const endOfToday = getUnixTime(endOfDay(today));

    const oneHour = 3600;

    while (timeMarker <= endOfToday) {
        data.push({ value: 0, timestamp: timeMarker });
        timeMarker += oneHour;
    }

    return data;
}

export function reconcileHeatmapData(data: HeatmapPoint[], dataFromStore: HeatmapPoint[]): HeatmapPoint[] {
    const parsedData = flattenHeatmapData(data);
    const heatmapData = dataFromStore.length ? dataFromStore : generateEmptyHeatmapData();

    return heatmapData.map(dataItem => {
        if (parsedData[dataItem.timestamp]) {
            dataItem.value = parsedData[dataItem.timestamp];
        }
        return dataItem;
    });
}

export function groupHeatmapByDay(heatmapData: HeatmapPoint[]): Map<string, GroupedHeatmapPoint[]> {
    return heatmapData.reduce<Map<string, GroupedHeatmapPoint[]>>((accumulator, data) => {
        const date = fromUnixTime(data.timestamp);
        const mapKey = startOfDay(date).toISOString();
        const dataToAppend: GroupedHeatmapPoint = {
            ...data,
            date: fromUnixTime(data.timestamp),
            hour: date.getHours(),
        };
        if (!accumulator.has(mapKey)) {
            accumulator.set(mapKey, []);
        }
        accumulator.get(mapKey)!.push(dataToAppend);
        return accumulator;
    }, new Map());
}
