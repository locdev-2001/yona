import { alertToneUrl, type AlertTone } from 'shared/alertSound/alertTones';

// Trình duyệt chặn phát âm khi trang chưa có tương tác nào: chỉ phát tự động sau
// cú bấm/phím đầu tiên của người dùng; trước đó tin tới thì im lặng (không lỗi đỏ).
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

let hasUserInteracted = false;
const audioByTone = new Map<AlertTone, HTMLAudioElement>();

function audioFor(tone: AlertTone): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;

    let audio = audioByTone.get(tone);
    if (!audio) {
        audio = new Audio(alertToneUrl(tone));
        audio.preload = 'auto';
        audioByTone.set(tone, audio);
    }

    return audio;
}

function playNow(tone: AlertTone): void {
    const audio = audioFor(tone);
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play()?.catch(() => undefined);
}

export function listenForFirstInteraction(): void {
    if (hasUserInteracted || typeof document === 'undefined') return;

    const unlock = () => {
        hasUserInteracted = true;
        UNLOCK_EVENTS.forEach(eventName => document.removeEventListener(eventName, unlock, true));
    };
    UNLOCK_EVENTS.forEach(eventName => document.addEventListener(eventName, unlock, true));
}

/** Âm báo tin mới — bỏ qua nếu người dùng chưa tương tác với trang lần nào. */
export function playAlertTone(tone: AlertTone): void {
    if (hasUserInteracted) playNow(tone);
}

/** Nút "Nghe thử": chính cú bấm là tương tác nên phát được ngay. */
export function previewAlertTone(tone: AlertTone): void {
    hasUserInteracted = true;
    playNow(tone);
}
