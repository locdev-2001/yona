import { format, fromUnixTime } from 'date-fns';

// Port từ dashboard/helper/downloadHelper.js
export function downloadCsvFile(fileName: string, content: string): HTMLAnchorElement {
    const blob = new Blob([content], { type: 'data:text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('download', fileName);
    link.setAttribute('href', url);
    link.click();
    return link;
}

export function generateFileName({
    type,
    to,
    businessHours = false,
}: {
    type: string;
    to: number;
    businessHours?: boolean;
}): string {
    let name = `${type}-report-${format(fromUnixTime(to), 'dd-MM-yyyy')}`;
    if (businessHours) {
        name = `${name}-business-hours`;
    }
    return `${name}.csv`;
}
