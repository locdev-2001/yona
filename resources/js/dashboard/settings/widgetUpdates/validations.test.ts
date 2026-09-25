import { describe, expect, it } from 'vitest';

import { isHttpUrl, isWidgetUpdateFormValid, widgetUpdateFormErrors } from './validations';
import type { WidgetUpdateFormValues } from './types';

const baseValues = (overrides: Partial<WidgetUpdateFormValues> = {}): WidgetUpdateFormValues => ({
    title: 'Giảm 15% bộ sưu tập men lam',
    body: '',
    tag: 'promo',
    coverUrl: '',
    ctaLabel: '',
    ctaUrl: '',
    inboxId: null,
    ...overrides,
});

describe('isHttpUrl', () => {
    it.each(['http://a.vn', 'https://a.vn/x?y=1'])('nhận %s', url => {
        expect(isHttpUrl(url)).toBe(true);
    });

    it.each(['javascript:alert(1)', 'data:text/html,x', 'ftp://a.vn', ''])('từ chối %s', url => {
        expect(isHttpUrl(url)).toBe(false);
    });
});

describe('widgetUpdateFormErrors', () => {
    it('hợp lệ thì không có lỗi', () => {
        expect(widgetUpdateFormErrors(baseValues())).toEqual({});
        expect(isWidgetUpdateFormValid(baseValues())).toBe(true);
    });

    it('tiêu đề rỗng báo lỗi bắt buộc', () => {
        expect(widgetUpdateFormErrors(baseValues({ title: '  ' })).title).toBe(
            'WIDGET_UPDATES_MGMT.FORM.TITLE.REQUIRED_ERROR',
        );
    });

    it('tiêu đề quá 120 ký tự báo lỗi độ dài', () => {
        const errors = widgetUpdateFormErrors(baseValues({ title: 'a'.repeat(121) }));
        expect(errors.title).toBe('WIDGET_UPDATES_MGMT.FORM.TITLE.MAX_ERROR');
    });

    it('nội dung quá 5000 ký tự báo lỗi độ dài', () => {
        const errors = widgetUpdateFormErrors(baseValues({ body: 'a'.repeat(5001) }));
        expect(errors.body).toBe('WIDGET_UPDATES_MGMT.FORM.BODY.MAX_ERROR');
    });

    it('cta_url kiểu javascript: bị từ chối', () => {
        const errors = widgetUpdateFormErrors(baseValues({ ctaUrl: 'javascript:alert(1)', ctaLabel: 'Xem' }));
        expect(errors.ctaUrl).toBe('WIDGET_UPDATES_MGMT.FORM.CTA_URL.INVALID_ERROR');
    });

    it('có cta_url mà thiếu chữ trên nút thì báo lỗi bắt buộc', () => {
        const errors = widgetUpdateFormErrors(baseValues({ ctaUrl: 'https://a.vn' }));
        expect(errors.ctaLabel).toBe('WIDGET_UPDATES_MGMT.FORM.CTA_LABEL.REQUIRED_ERROR');
        expect(isWidgetUpdateFormValid(baseValues({ ctaUrl: 'https://a.vn' }))).toBe(false);
    });

    it('có chữ trên nút mà không có cta_url vẫn hợp lệ (không bắt buộc chiều ngược lại)', () => {
        expect(widgetUpdateFormErrors(baseValues({ ctaLabel: 'Xem' }))).toEqual({});
    });

    it('chữ trên nút quá 40 ký tự báo lỗi độ dài', () => {
        const errors = widgetUpdateFormErrors(baseValues({ ctaUrl: 'https://a.vn', ctaLabel: 'a'.repeat(41) }));
        expect(errors.ctaLabel).toBe('WIDGET_UPDATES_MGMT.FORM.CTA_LABEL.MAX_ERROR');
    });
});
