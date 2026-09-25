import { describe, expect, it } from 'vitest';

import {
    CSAT_LEVELS,
    csatLevelFor,
    csatResponseFrom,
    csatSurveyUuidFromUrl,
    isCsatFeedbackSubmitted,
    isCsatRatingSubmitted,
} from './csatHelpers';

describe('csatResponseFrom', () => {
    it('reads the response out of submitted_values', () => {
        expect(csatResponseFrom({ csat_survey_response: { rating: 4, feedback_message: 'ok' } })).toEqual({
            rating: 4,
            feedback_message: 'ok',
        });
    });

    it('returns null for the shapes other content types submit', () => {
        expect(csatResponseFrom(null)).toBeNull();
        expect(csatResponseFrom(undefined)).toBeNull();
        expect(csatResponseFrom([{ name: 'plan', value: 'pro' }])).toBeNull();
        expect(csatResponseFrom({ submitted_email: 'a@b.com' })).toBeNull();
    });
});

describe('isCsatRatingSubmitted', () => {
    it('is true only once a rating is stored', () => {
        expect(isCsatRatingSubmitted({ rating: 1 })).toBe(true);
        expect(isCsatRatingSubmitted({ rating: null, feedback_message: 'hi' })).toBe(false);
        expect(isCsatRatingSubmitted(null)).toBe(false);
    });
});

describe('isCsatFeedbackSubmitted', () => {
    it('locks the form on a stored feedback message', () => {
        expect(isCsatFeedbackSubmitted({ rating: 5, feedback_message: 'great' })).toBe(true);
        expect(isCsatFeedbackSubmitted({ rating: 5, feedback_message: '' })).toBe(false);
        expect(isCsatFeedbackSubmitted(null)).toBe(false);
    });

    it('locks the form right away when this session just submitted', () => {
        expect(isCsatFeedbackSubmitted(null, true)).toBe(true);
    });
});

describe('csatSurveyUuidFromUrl', () => {
    it('takes the last path segment', () => {
        expect(csatSurveyUuidFromUrl('https://app.test/survey/responses/abc-123')).toBe('abc-123');
        expect(csatSurveyUuidFromUrl('https://app.test/survey/responses/abc-123/')).toBe('abc-123');
        expect(csatSurveyUuidFromUrl('https://app.test/survey/responses/abc-123?x=1')).toBe('abc-123');
        expect(csatSurveyUuidFromUrl('https://app.test/survey/responses/abc-123#top')).toBe('abc-123');
    });
});

describe('csatLevelFor', () => {
    it('ba mức Kém / Ổn / Tuyệt là 1 / 3 / 5', () => {
        expect(CSAT_LEVELS.map(level => [level.key, level.value])).toStrictEqual([
            ['POOR', 1],
            ['OKAY', 3],
            ['GREAT', 5],
        ]);
    });

    it('điểm theo thang 5 mức cũ về mức gần nghĩa nhất', () => {
        expect([1, 2, 3, 4, 5].map(rating => csatLevelFor(rating).key)).toStrictEqual([
            'POOR',
            'POOR',
            'OKAY',
            'GREAT',
            'GREAT',
        ]);
    });
});
