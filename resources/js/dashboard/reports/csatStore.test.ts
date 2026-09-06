import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './api';
import { csatSelectors, csatStateForTest, fetchCsatMetrics, fetchCsatResponses, resetCsatStore } from './csatStore';

// Port từ store/modules/specs/csat/{getters,mutations,actions}.spec.js —
// vuex getter/mutation gộp thành selector + action của store module.

const stateAfterMetrics = async (payload: api.CsatMetricsResponse) => {
    vi.spyOn(api, 'getCsatMetrics').mockResolvedValue(payload);
    await fetchCsatMetrics(1, { from: 0, to: 0 });
};

describe('csatStore', () => {
    beforeEach(() => {
        resetCsatStore();
        vi.restoreAllMocks();
    });

    it('chuẩn hoá metrics và bù 0 cho mức đánh giá thiếu', async () => {
        await stateAfterMetrics({
            total_count: 29,
            ratings_count: { 1: 10, 2: 10, 3: 3, 4: 3, 5: 3 },
            total_sent_messages_count: 120,
        });
        expect(csatSelectors.metrics(csatStateForTest())).toEqual({
            totalResponseCount: 29,
            ratingsCount: { 1: 10, 2: 10, 3: 3, 4: 3, 5: 3 },
            totalSentMessagesCount: 120,
        });

        await stateAfterMetrics({ ratings_count: { 1: 5 } } as unknown as api.CsatMetricsResponse);
        expect(csatSelectors.metrics(csatStateForTest())).toEqual({
            totalResponseCount: 0,
            ratingsCount: { 1: 5, 2: 0, 3: 0, 4: 0, 5: 0 },
            totalSentMessagesCount: 0,
        });
    });

    it('tính điểm hài lòng và tỉ lệ phản hồi như bản gốc', async () => {
        expect(csatSelectors.satisfactionScore(csatStateForTest())).toEqual(0);
        expect(csatSelectors.responseRate(csatStateForTest())).toEqual(0);

        await stateAfterMetrics({
            total_count: 54,
            ratings_count: { 1: 0, 2: 0, 3: 0, 4: 12, 5: 15 },
            total_sent_messages_count: 108,
        });
        expect(csatSelectors.satisfactionScore(csatStateForTest())).toEqual('50.00');
        expect(csatSelectors.responseRate(csatStateForTest())).toEqual('50.00');
    });

    it('lưu danh sách phản hồi và hạ cờ nạp', async () => {
        vi.spyOn(api, 'getCsatResponses').mockResolvedValue([
            { id: 1, rating: 1, feedback_message: 'Bad' } as api.CsatSurveyResponse,
        ]);
        await fetchCsatResponses(1, { from: 0, to: 0, page: 1 });

        expect(csatSelectors.responses(csatStateForTest())).toHaveLength(1);
        expect(csatSelectors.uiFlags(csatStateForTest())).toEqual({ isFetching: false, isFetchingMetrics: false });
    });
});
