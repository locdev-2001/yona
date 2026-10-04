import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ICONS } from 'dashboard/icons';
import ReplyTopPanel from './ReplyTopPanel';

describe('thanh soạn tin tinh gọn', () => {
    it('ẩn trợ lý chưa hoạt động, vẫn phóng to ô soạn được', () => {
        const toggleEditorSize = vi.fn();
        const { container } = render(<ReplyTopPanel
            mode="reply"
            captainTasksEnabled
            isMessageLengthReachingThreshold={false}
            charactersRemaining={100}
            onSetReplyMode={() => undefined}
            onToggleEditorSize={toggleEditorSize}
        />);

        expect(container.querySelector(`.${ICONS.ai}`)).toBeNull();
        fireEvent.click(container.querySelector('.i-lucide-maximize-2')!.closest('button')!);
        expect(toggleEditorSize).toHaveBeenCalledOnce();
    });
});
