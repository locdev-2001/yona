import { alertToneUrl, type AlertTone } from '../../shared/alertSound/alertTones';

export const initOnEvents = ['click', 'touchstart', 'keypress', 'keydown'];

// KHÁC BIỆT CỐ Ý so với bản gốc: gốc `fetch` tệp mp3 rồi decodeAudioData qua
// AudioContext. SDK luôn chạy trên origin của khách nên fetch đó là chéo origin
// → trình duyệt chặn CORS và in lỗi đỏ vào console website của khách. Thẻ
// <audio> tải tài nguyên chéo origin không cần CORS, nên đổi sang HTMLAudioElement.
// Gọi sau tương tác đầu tiên của người dùng (initOnEvents) nên autoplay policy cho phát.
export const getAlertAudio = async (baseUrl: string, tone: AlertTone): Promise<void> => {
    if (typeof Audio === 'undefined') return;

    const audio = new Audio(alertToneUrl(tone, baseUrl));
    audio.preload = 'auto';

    window.playAudioAlert = () => {
        audio.currentTime = 0;
        // Bị autoplay policy chặn thì im lặng, đúng bản gốc.
        void audio.play().catch(() => {});
    };
};
