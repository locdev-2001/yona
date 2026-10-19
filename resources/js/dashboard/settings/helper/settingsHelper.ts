// Port từ dashboard/routes/dashboard/settings/helper/settingsHelper.js.
export function getI18nKey(prefix: string, event: string): string {
    return `${prefix}.${event.toUpperCase()}`;
}
