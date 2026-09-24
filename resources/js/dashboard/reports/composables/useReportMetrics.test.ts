import { describe, expect, it, vi } from 'vitest';

import { calculateTrendFor, displayMetricFor, isAverageMetricType } from './useReportMetrics';
import type { AccountSummary } from '../types';

// Port từ dashboard/composables/spec/useReportMetrics.spec.js — getter vuex
// (useMapGetter) thay bằng truyền thẳng summary vào hàm thuần.
vi.mock('@ext/utils', () => ({ formatTime: (time: number) => `formatted_${time}` }));

const summary = {
    avg_first_response_time: '198.6666666666667',
    avg_resolution_time: '208.3333333333333',
    conversations_count: 5000,
    incoming_messages_count: 5,
    outgoing_messages_count: 3,
    previous: {
        avg_first_response_time: '89.0',
        avg_resolution_time: '145.0',
        conversations_count: 4,
        incoming_messages_count: 5,
        outgoing_messages_count: 4,
        resolutions_count: 0,
    },
    resolutions_count: 3,
} as unknown as AccountSummary;

const botSummary = {
    bot_resolutions_count: 10,
    bot_handoffs_count: 20,
    previous: { bot_resolutions_count: 8, bot_handoffs_count: 5 },
} as unknown as AccountSummary;

describe('useReportMetrics', () => {
    it('calculates trend correctly', () => {
        expect(calculateTrendFor(summary, 'conversations_count')).toBe(124900);
        expect(calculateTrendFor(summary, 'incoming_messages_count')).toBe(0);
        expect(calculateTrendFor(summary, 'avg_first_response_time')).toBe(123);
    });

    it('returns 0 for trend when previous value is not available', () => {
        expect(calculateTrendFor(summary, 'non_existent_key')).toBe(0);
    });

    it('identifies average metric types correctly', () => {
        expect(isAverageMetricType('avg_first_response_time')).toBe(true);
        expect(isAverageMetricType('avg_resolution_time')).toBe(true);
        expect(isAverageMetricType('reply_time')).toBe(true);
        expect(isAverageMetricType('conversations_count')).toBe(false);
    });

    it('displays metrics correctly for account', () => {
        expect(displayMetricFor(summary, 'conversations_count')).toBe('5,000');
        expect(displayMetricFor(summary, 'incoming_messages_count')).toBe('5');
    });

    it('displays the metric for bot', () => {
        expect(displayMetricFor(botSummary, 'bot_resolutions_count')).toBe('10');
        expect(displayMetricFor(botSummary, 'bot_handoffs_count')).toBe('20');
    });

    it('handles non-existent metrics', () => {
        expect(displayMetricFor(summary, 'non_existent_key')).toBe('0');
    });
});
