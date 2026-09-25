import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CSAT_LEVELS } from 'shared/helpers/csatHelpers';

import AgentMessage from './AgentMessage';
import { MESSAGE_TYPE } from '../helpers/constants';
import { widgetStore } from '../store/widgetStore';
import type { WidgetMessage } from '../types';

const CSAT_SENT_AT = 1788738386;

const csatMessage = (submittedValues?: Record<string, unknown>): WidgetMessage =>
    ({
        id: 893,
        content: 'Please rate the conversation',
        message_type: MESSAGE_TYPE.TEMPLATE,
        content_type: 'input_csat',
        created_at: CSAT_SENT_AT,
        content_attributes: {
            display_type: 'emoji',
            ...(submittedValues ? { submitted_values: submittedValues } : {}),
        },
    }) as unknown as WidgetMessage;

// Phiếu CSAT hiện thành thẻ "kết thúc & đánh giá" ở CẢ hai trạng thái khi widget tải lại
// lịch sử hội thoại đã đóng: chưa chấm (còn chấm được) và đã chấm (khoá, hiện mức đã chọn).
describe('AgentMessage — thẻ kết thúc & đánh giá', () => {
    beforeEach(() => {
        widgetStore.clearConversationAttributes();
        widgetStore.addOrUpdateMessage(csatMessage());
    });

    afterEach(() => vi.restoreAllMocks());

    it('ba mức Kém / Ổn / Tuyệt, ô góp ý, nút gửi chỉ bấm được khi đã chọn mức', () => {
        render(<AgentMessage message={csatMessage()} />);

        const card = screen.getByTestId('conversation-end');
        expect(within(card).getByRole('heading').textContent).toBe('Please rate the conversation');
        expect(within(card).getAllByRole('radio').map(button => button.textContent)).toStrictEqual(['Poor', 'Okay', 'Great']);
        expect(within(card).getByRole('textbox', { name: 'What could be better? (optional)' })).toBeInTheDocument();
        expect(within(card).getByRole('button', { name: 'Send rating' })).toBeDisabled();
    });

    it('Tuyệt gửi điểm 5 kèm góp ý theo thang CSAT 1–5 mà báo cáo dùng', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ contact: {} })));
        render(<AgentMessage message={csatMessage()} />);

        fireEvent.click(screen.getByRole('radio', { name: 'Great' }));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  phuc vu tot  ' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send rating' })));

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/api/v1/widget/messages/893');
        expect(JSON.parse(String(init.body)).message.submitted_values).toStrictEqual({
            csat_survey_response: { rating: 5, feedback_message: 'phuc vu tot' },
        });
    });

    it('gửi đánh giá lỗi mạng thì báo ngắn trong thẻ, mức đã chọn và góp ý còn nguyên để gửi lại', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        render(<AgentMessage message={csatMessage()} />);

        fireEvent.click(screen.getByRole('radio', { name: 'Okay' }));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hơi lâu' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send rating' })));

        const card = screen.getByTestId('conversation-end');
        expect(within(card).getByRole('alert').textContent).toBe('Your rating was not sent. Please try again.');
        expect(within(card).getByRole('radio', { name: 'Okay' })).toHaveAttribute('aria-checked', 'true');
        expect(within(card).getByRole('textbox')).toHaveValue('hơi lâu');
        expect(within(card).getByRole('button', { name: 'Send rating' })).toBeEnabled();
    });

    it('Kém là 1, Ổn là 3', () => {
        expect(CSAT_LEVELS.map(level => [level.key, level.value])).toStrictEqual([
            ['POOR', 1],
            ['OKAY', 3],
            ['GREAT', 5],
        ]);
    });

    it('đã chấm thì khoá, cảm ơn khách và hiện mức gần nghĩa với điểm cũ của thang 5 mức', () => {
        render(
            <AgentMessage
                message={csatMessage({ csat_survey_response: { rating: 4, feedback_message: 'phuc vu tot' } })}
            />,
        );

        const card = screen.getByTestId('conversation-end');
        expect(within(card).getByRole('heading').textContent).toBe('Thanks for your rating!');
        expect(within(card).getByRole('radio', { name: 'Great' })).toHaveAttribute('aria-checked', 'true');
        within(card)
            .getAllByRole('radio')
            .forEach(button => expect(button).toBeDisabled());
        expect(within(card).queryByRole('textbox')).toBeNull();
    });

    it('ghi thời gian đã hỗ trợ tính từ lúc mở hội thoại tới lúc gửi phiếu', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ id: 1, status: 'resolved', created_at: CSAT_SENT_AT - 6 * 60 })),
        );
        await act(() => widgetStore.getConversationAttributes());

        render(<AgentMessage message={csatMessage()} />);

        expect(screen.getByTestId('conversation-end').textContent).toContain('Helped you for 6 minutes');
    });

    // Điểm đã chấm không được lặp lại thành bong bóng tin của khách.
    it('does not echo the submitted rating as a visitor message', () => {
        const { container } = render(
            <AgentMessage
                message={csatMessage({ csat_survey_response: { rating: 4, feedback_message: 'phuc vu tot' } })}
            />,
        );

        expect(container.querySelector('.agent-message-wrap.has-response')).toBeNull();
        expect(container.querySelector('.user-message-wrap')).toBeNull();
    });
});
