import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SurveyResponse from './Response';

const surveyDetails = (rating: number | null) => ({
    id: 1,
    csat_survey_response: rating === null ? null : { rating, feedback_message: '' },
    display_type: 'star',
    content: null,
    inbox_avatar_url: '',
    inbox_name: 'Shop Hoa Mai',
    locale: 'en',
    conversation_id: 9,
    created_at: '2026-09-25T00:00:00Z',
});

const mockSurveyApi = (rating: number | null) => {
    const submissions: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
        if (init?.method === 'PUT') submissions.push(JSON.parse(String(init.body)));

        return new Response(JSON.stringify(surveyDetails(rating)));
    });

    return submissions;
};

afterEach(() => vi.restoreAllMocks());

describe('trang khảo sát CSAT công khai', () => {
    it('luôn là ba nút Kém / Ổn / Tuyệt như widget, kiểu hiển thị cũ (sao) không còn tác dụng', async () => {
        mockSurveyApi(null);

        await act(async () => render(<SurveyResponse />));

        expect(screen.getAllByRole('radio').map(radio => radio.textContent)).toStrictEqual(['Poor', 'Okay', 'Great']);
        expect(screen.queryByRole('button', { name: /star/i })).toBeNull();
    });

    it('bấm Ổn thì gửi điểm 3 theo thang CSAT', async () => {
        const submissions = mockSurveyApi(null);
        await act(async () => render(<SurveyResponse />));

        await act(async () => fireEvent.click(screen.getByRole('radio', { name: 'Okay' })));

        expect(submissions).toStrictEqual([
            { message: { submitted_values: { csat_survey_response: { rating: 3, feedback_message: '' } } } },
        ]);
    });

    it('điểm cũ theo thang 5 mức hiện về mức gần nhất (4 là Tuyệt)', async () => {
        mockSurveyApi(4);

        await act(async () => render(<SurveyResponse />));

        expect(screen.getByRole('radio', { name: 'Great' })).toHaveAttribute('aria-checked', 'true');
    });
});
