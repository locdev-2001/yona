import previewCopy from '../../../../lang/vi/admin_design_preview.json';

export { previewCopy };

export function previewText(key: keyof typeof previewCopy, ...values: (string | number)[]): string {
    return previewCopy[key].replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? ''));
}

export { DesignCopyProvider, useDesignCopy } from './copy-context';
