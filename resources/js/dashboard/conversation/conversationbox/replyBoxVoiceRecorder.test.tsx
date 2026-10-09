import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '../../../i18n';

const { sendReplySpy, alertSpy, inboxCapabilities, accountFeatures } = vi.hoisted(() => ({
    sendReplySpy: vi.fn(),
    alertSpy: vi.fn(),
    inboxCapabilities: { current: ['outbound_text', 'outbound_audio'] as string[] },
    accountFeatures: { current: { voice_recorder: true } as Record<string, boolean> },
}));

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Lộc', message_signature: '' } },
            currentAccount: { id: 2, features: accountFeatures.current },
            inboxes: [{ id: 1, name: 'Zalo', channel_type: 'Channel::Zalo', capabilities: inboxCapabilities.current }],
        },
    }),
    router: { visit: vi.fn() },
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: vi.fn().mockResolvedValue({ source: 'recent', query: null, pack_id: null, stickers: [], packs: [] }),
    postJson: vi.fn(),
    patchJson: vi.fn(),
    parseApiErrorMessage: () => null,
}));

vi.mock('dashboard/composables/useAlert', () => ({ useAlert: alertSpy }));

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        selectedConversation: {
            id: 4,
            inbox_id: 1,
            can_reply: true,
            status: 'open',
            meta: { sender: { id: 3, name: 'Khách A' }, assignee: { id: 1, name: 'Lộc' } },
        },
        conversationId: 4,
        accountId: 2,
        messages: [],
        sendReply: sendReplySpy,
        sendSticker: vi.fn(),
        sendStructured: vi.fn(),
        uiSettings: {},
        updateUISettings: vi.fn(),
        toggleTypingStatus: vi.fn(),
    }),
}));

vi.mock('dashboard/components/widgets/WootWriter/Editor', async () => {
    const React = await import('react');

    return {
        default: React.forwardRef(function EditorStub(
            props: { value: string; onChange: (value: string) => void },
            ref: React.Ref<unknown>,
        ) {
            React.useImperativeHandle(ref, () => ({ focusEditorInputField: vi.fn(), insertText: vi.fn() }));

            return (
                <textarea aria-label="editor-stub" value={props.value} onChange={event => props.onChange(event.target.value)} />
            );
        }),
    };
});

import ReplyBox from './ReplyBox';

// MediaRecorder giả: start() ghi nhận, stop() đẩy một mảnh dữ liệu rồi báo dừng như trình duyệt.
class FakeMediaRecorder {
    static instances: FakeMediaRecorder[] = [];
    static supportedTypes = new Set(['audio/webm;codecs=opus']);
    static isTypeSupported = (type: string) => FakeMediaRecorder.supportedTypes.has(type);

    state: 'inactive' | 'recording' = 'inactive';
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(
        public stream: MediaStream,
        options?: { mimeType?: string },
    ) {
        this.mimeType = options?.mimeType ?? 'audio/webm';
        FakeMediaRecorder.instances.push(this);
    }

    start(): void {
        this.state = 'recording';
    }

    stop(): void {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['tieng-noi'], { type: this.mimeType }) });
        this.onstop?.();
    }
}

const stopTrack = vi.fn();
const getUserMedia = vi.fn();
const originalMediaDevices = navigator.mediaDevices;

function installRecordingSupport(): void {
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeMediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
}

function removeRecordingSupport(): void {
    delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices });
}

const micButton = () => screen.queryByTitle(t('CONVERSATION.REPLYBOX.TIP_AUDIORECORDER_ICON'));

async function startRecording(): Promise<void> {
    fireEvent.click(micButton()!);
    await screen.findByText(t('CONVERSATION.REPLYBOX.VOICE_RECORDER.RECORDING'));
}

describe('ReplyBox — ghi âm', () => {
    beforeEach(() => {
        window.localStorage.clear();
        FakeMediaRecorder.instances = [];
        FakeMediaRecorder.supportedTypes = new Set(['audio/webm;codecs=opus']);
        stopTrack.mockReset();
        getUserMedia.mockReset();
        getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
        sendReplySpy.mockReset();
        alertSpy.mockReset();
        inboxCapabilities.current = ['outbound_text', 'outbound_audio'];
        accountFeatures.current = { voice_recorder: true };
        URL.createObjectURL = vi.fn(() => 'blob:ban-ghi');
        URL.revokeObjectURL = vi.fn();
        installRecordingSupport();
    });

    afterEach(() => {
        removeRecordingSupport();
    });

    it('bấm micro: xin quyền, ghi, dừng rồi nghe lại và gửi bản ghi như một đính kèm tin thoại', async () => {
        render(<ReplyBox />);

        await startRecording();

        expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
        expect(FakeMediaRecorder.instances[0].mimeType).toBe('audio/webm;codecs=opus');
        expect(micButton()).toHaveProperty('disabled', true);

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.STOP_AUDIO_RECORDING') }));

        const preview = await screen.findByTestId('voice-message-preview');
        expect(stopTrack).toHaveBeenCalled();
        expect(screen.queryByTestId('voice-recorder-bar')).toBeNull();
        expect(preview.querySelector('audio')?.getAttribute('src')).toBe('blob:ban-ghi');
        expect(screen.queryByTestId('attachment-tray')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.VOICE_RECORDER.SEND') }));

        await waitFor(() => expect(sendReplySpy).toHaveBeenCalledTimes(1));
        const [payload] = sendReplySpy.mock.calls[0];
        expect(payload.isVoiceMessage).toBe(true);
        expect(payload.isPrivate).toBe(false);
        expect(payload.attachments).toHaveLength(1);
        expect(payload.attachments[0].file.type).toBe('audio/webm');
        expect(payload.attachments[0].file.name).toMatch(/^voice-message-\d{8}-\d{6}\.webm$/);
        await waitFor(() => expect(screen.queryByTestId('voice-message-preview')).toBeNull());
    });

    it('huỷ khi đang ghi: không có đính kèm, micro được nhả', async () => {
        render(<ReplyBox />);
        await startRecording();

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.VOICE_RECORDER.CANCEL') }));

        await waitFor(() => expect(screen.queryByTestId('voice-recorder-bar')).toBeNull());
        expect(stopTrack).toHaveBeenCalled();
        expect(screen.queryByTestId('voice-message-preview')).toBeNull();
        expect(micButton()).toHaveProperty('disabled', false);
    });

    it('xoá bản ghi đã dừng thì không còn gì để gửi', async () => {
        render(<ReplyBox />);
        await startRecording();
        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.STOP_AUDIO_RECORDING') }));
        await screen.findByTestId('voice-message-preview');

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.VOICE_RECORDER.DISCARD') }));

        expect(screen.queryByTestId('voice-message-preview')).toBeNull();
        expect(sendReplySpy).not.toHaveBeenCalled();
    });

    it('ghi lại lần hai thay bản ghi cũ, một tin chỉ mang một bản ghi', async () => {
        render(<ReplyBox />);
        for (let round = 0; round < 2; round += 1) {
            await startRecording();
            fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.STOP_AUDIO_RECORDING') }));
            await screen.findByTestId('voice-message-preview');
        }

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.VOICE_RECORDER.SEND') }));

        await waitFor(() => expect(sendReplySpy).toHaveBeenCalledTimes(1));
        expect(sendReplySpy.mock.calls[0][0].attachments).toHaveLength(1);
    });

    it('bị từ chối quyền micro: báo cách cho phép, không vào trạng thái ghi', async () => {
        getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
        render(<ReplyBox />);

        fireEvent.click(micButton()!);

        await waitFor(() =>
            expect(alertSpy).toHaveBeenCalledWith(t('CONVERSATION.REPLYBOX.VOICE_RECORDER.PERMISSION_DENIED')),
        );
        expect(screen.queryByTestId('voice-recorder-bar')).toBeNull();
        expect(FakeMediaRecorder.instances).toHaveLength(0);
    });

    it('máy không có micro: báo cắm micro', async () => {
        getUserMedia.mockRejectedValue(new DOMException('Requested device not found', 'NotFoundError'));
        render(<ReplyBox />);

        fireEvent.click(micButton()!);

        await waitFor(() =>
            expect(alertSpy).toHaveBeenCalledWith(t('CONVERSATION.REPLYBOX.VOICE_RECORDER.NO_MICROPHONE')),
        );
    });

    it('Safari: không có Opus thì ghi mp4 AAC, tệp gửi đi đuôi .m4a', async () => {
        FakeMediaRecorder.supportedTypes = new Set(['audio/mp4']);
        render(<ReplyBox />);
        await startRecording();
        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.STOP_AUDIO_RECORDING') }));
        await screen.findByTestId('voice-message-preview');

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.REPLYBOX.VOICE_RECORDER.SEND') }));

        await waitFor(() => expect(sendReplySpy).toHaveBeenCalledTimes(1));
        const [{ file }] = sendReplySpy.mock.calls[0][0].attachments as Array<{ file: File }>;
        expect(file.type).toBe('audio/mp4');
        expect(file.name.endsWith('.m4a')).toBe(true);
    });

    it('đạt thời lượng tối đa thì tự dừng, giữ bản ghi và báo cho nhân viên', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
        try {
            render(<ReplyBox />);
            fireEvent.click(micButton()!);
            await act(async () => {
                await Promise.resolve();
            });
            expect(screen.getByTestId('voice-recorder-bar')).toBeTruthy();

            await act(async () => {
                vi.advanceTimersByTime(300_000 + 500);
            });

            expect(screen.getByTestId('voice-message-preview')).toBeTruthy();
            expect(alertSpy).toHaveBeenCalledWith(
                t('CONVERSATION.REPLYBOX.VOICE_RECORDER.MAX_DURATION_REACHED', { minutes: 5 }),
            );
        } finally {
            vi.useRealTimers();
        }
    });

    it('Lưu ý riêng giữa lúc ghi: bỏ bản ghi, nhả micro, không có nút micro', async () => {
        render(<ReplyBox />);
        await startRecording();

        fireEvent.click(screen.getByRole('button', { name: /Private Note/ }));

        await waitFor(() => expect(screen.queryByTestId('voice-recorder-bar')).toBeNull());
        expect(stopTrack).toHaveBeenCalled();
        expect(micButton()).toBeNull();
        expect(screen.queryByTestId('voice-message-preview')).toBeNull();
    });

    it('trình duyệt không có MediaRecorder thì không hiện nút micro', () => {
        removeRecordingSupport();
        render(<ReplyBox />);

        expect(micButton()).toBeNull();
    });

    it('kênh không gửi được âm thanh hoặc account tắt cờ ghi âm thì không hiện nút micro', () => {
        inboxCapabilities.current = ['outbound_text'];
        const { unmount } = render(<ReplyBox />);
        expect(micButton()).toBeNull();
        unmount();

        inboxCapabilities.current = ['outbound_text', 'outbound_audio'];
        accountFeatures.current = {};
        render(<ReplyBox />);
        expect(micButton()).toBeNull();
    });
});
