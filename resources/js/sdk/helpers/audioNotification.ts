// Port: refs/chatwoot/app/javascript/shared/helpers/AudioNotificationHelper.js (phần SDK dùng).
export const initOnEvents = ['click', 'touchstart', 'keypress', 'keydown'];

export const getAudioContext = (): AudioContext | undefined => {
    try {
        const AudioContextClass =
            window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        return AudioContextClass ? new AudioContextClass() : undefined;
    } catch {
        return undefined;
    }
};

export const getAlertAudio = async (
    baseUrl = '',
    requestContext?: { type?: string; alertTone?: string },
): Promise<void> => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const { type = 'dashboard', alertTone = 'ding' } = requestContext ?? {};

    try {
        const response = await fetch(new Request(`${baseUrl}/audio/${type}/${alertTone}.mp3`));
        const audioBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());

        window.playAudioAlert = () => {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.loop = false;
            source.start();
        };
    } catch {
        // Không có tệp âm thanh thì im lặng, đúng bản gốc.
    }
};
