import type { WidgetUpdateFormValues } from './types';

// Port validation phía FE cho form bài cập nhật widget — khớp rule phía BE
// (WidgetUpdatesController::validatedUpdate) để báo lỗi ngay khi gõ, không đợi
// round-trip API.
export const TITLE_MAX_LENGTH = 120;
export const BODY_MAX_LENGTH = 5000;
export const CTA_LABEL_MAX_LENGTH = 40;

// Chỉ nhận link http(s) thật — chặn `javascript:`, `data:` và mọi lược đồ khác.
export function isHttpUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
}

export interface WidgetUpdateFormErrors {
    title?: string;
    body?: string;
    ctaUrl?: string;
    ctaLabel?: string;
}

export function widgetUpdateFormErrors(values: WidgetUpdateFormValues): WidgetUpdateFormErrors {
    const errors: WidgetUpdateFormErrors = {};
    const baseKey = 'WIDGET_UPDATES_MGMT.FORM';

    if (!values.title.trim()) {
        errors.title = `${baseKey}.TITLE.REQUIRED_ERROR`;
    } else if (values.title.length > TITLE_MAX_LENGTH) {
        errors.title = `${baseKey}.TITLE.MAX_ERROR`;
    }

    if (values.body.length > BODY_MAX_LENGTH) {
        errors.body = `${baseKey}.BODY.MAX_ERROR`;
    }

    if (values.ctaUrl.trim() && !isHttpUrl(values.ctaUrl.trim())) {
        errors.ctaUrl = `${baseKey}.CTA_URL.INVALID_ERROR`;
    }

    if (values.ctaUrl.trim() && !values.ctaLabel.trim()) {
        errors.ctaLabel = `${baseKey}.CTA_LABEL.REQUIRED_ERROR`;
    } else if (values.ctaLabel.length > CTA_LABEL_MAX_LENGTH) {
        errors.ctaLabel = `${baseKey}.CTA_LABEL.MAX_ERROR`;
    }

    return errors;
}

export const isWidgetUpdateFormValid = (values: WidgetUpdateFormValues): boolean =>
    Object.keys(widgetUpdateFormErrors(values)).length === 0;
