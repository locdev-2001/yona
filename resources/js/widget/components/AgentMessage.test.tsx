import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AgentMessage from './AgentMessage';
import { MESSAGE_TYPE } from '../helpers/constants';
import type { WidgetMessage } from '../types';

const csatMessage = (submittedValues?: Record<string, unknown>): WidgetMessage =>
    ({
        id: 893,
        content: 'Please rate the conversation',
        message_type: MESSAGE_TYPE.TEMPLATE,
        content_type: 'input_csat',
        created_at: 1788738386,
        content_attributes: {
            display_type: 'emoji',
            ...(submittedValues ? { submitted_values: submittedValues } : {}),
        },
    }) as unknown as WidgetMessage;

// C5: bong bóng khảo sát phải hiện ở CẢ hai trạng thái khi widget tải lại lịch sử
// hội thoại đã đóng — chưa chấm (còn chấm được) và đã chấm (khoá, hiện điểm cũ).
describe('AgentMessage — bong bóng input_csat', () => {
    it('renders the rating form when no rating has been submitted', () => {
        const { container } = render(<AgentMessage message={csatMessage()} />);

        const block = container.querySelector('.customer-satisfaction');
        expect(block).not.toBeNull();
        expect(block?.querySelector('h6')?.textContent).toContain('Please rate the conversation');
        expect(block?.querySelectorAll('.ratings button')).toHaveLength(5);
        expect(block?.querySelector('.feedback-form')).not.toBeNull();
        expect(block?.querySelector('.ratings button.selected')).toBeNull();
    });

    it('renders the submitted state after the visitor rated the conversation', () => {
        const { container } = render(
            <AgentMessage
                message={csatMessage({ csat_survey_response: { rating: 4, feedback_message: 'phuc vu tot' } })}
            />,
        );

        const block = container.querySelector('.customer-satisfaction');
        expect(block).not.toBeNull();
        expect(block?.querySelector('h6')?.textContent).toContain('Thank you for submitting the rating');
        expect(block?.querySelector('.feedback-form')).toBeNull();
        expect(block?.querySelectorAll('.ratings button.selected')).toHaveLength(1);
        expect(block?.querySelectorAll('.ratings button.disabled')).toHaveLength(5);
    });

    // AgentMessage.vue#hasRecordedResponse loại `input_csat`: điểm đã chấm không
    // được lặp lại thành bong bóng tin của khách.
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
