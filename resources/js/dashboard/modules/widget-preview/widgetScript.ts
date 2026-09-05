import { t } from '../../../i18n';

// Hai computed thuần của Widget.vue tách ra để test được: chèn khối
// `window.chatwootSettings` ngay sau `<script>` (13 ký tự đầu của đoạn nhúng)
// và ánh xạ reply_time sang câu "Typically replies in …".
export interface WidgetBubbleOptions {
    position: string;
    type: string;
    launcherTitle: string;
}

const SCRIPT_TAG_OFFSET = 13;

export function buildWidgetScript(webWidgetScript: string, options: WidgetBubbleOptions): string {
    if (!webWidgetScript) return '';

    return (
        webWidgetScript.substring(0, SCRIPT_TAG_OFFSET) +
        t('INBOX_MGMT.WIDGET_BUILDER.SCRIPT_SETTINGS', { options: JSON.stringify(options) }) +
        webWidgetScript.substring(SCRIPT_TAG_OFFSET)
    );
}

export function replyTimeText(replyTime: string): string {
    switch (replyTime) {
        case 'in_a_few_minutes':
            return t('INBOX_MGMT.WIDGET_BUILDER.REPLY_TIME.IN_A_FEW_MINUTES');
        case 'in_a_day':
            return t('INBOX_MGMT.WIDGET_BUILDER.REPLY_TIME.IN_A_DAY');
        default:
            return t('INBOX_MGMT.WIDGET_BUILDER.REPLY_TIME.IN_A_FEW_HOURS');
    }
}
