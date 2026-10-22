import { useSyncExternalStore } from 'react';

interface CallPreferences {
    showStatistics: boolean;
    noiseSuppression: boolean;
    outputVolume: number;
    participantVolumes: Record<string, number>;
}

const STORAGE_KEY = 'yona.call.preferences.v1';
const listeners = new Set<() => void>();
const defaults: CallPreferences = { showStatistics: false, noiseSuppression: true, outputVolume: 1, participantVolumes: {} };

export const clampVolume = (value: number, maximum = 2) => (Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : 1);

function loadPreferences(): CallPreferences {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<CallPreferences> | null;
        return {
            showStatistics: saved?.showStatistics === true,
            noiseSuppression: saved?.noiseSuppression !== false,
            outputVolume: clampVolume(saved?.outputVolume ?? 1, 1),
            participantVolumes: Object.fromEntries(
                Object.entries(saved?.participantVolumes ?? {})
                    .slice(-256)
                    .filter(([identity, volume]) => /^user:\d+$/.test(identity) && typeof volume === 'number')
                    .map(([identity, volume]) => [identity, clampVolume(volume)]),
            ),
        };
    } catch {
        return defaults;
    }
}

let preferences = loadPreferences();
export const readCallPreferences = () => preferences;
export const subscribeCallPreferences = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
export const useCallPreferences = () => useSyncExternalStore(subscribeCallPreferences, readCallPreferences);

export function updateCallPreferences(update: Partial<CallPreferences>) {
    preferences = { ...preferences, ...update };
    if (update.outputVolume !== undefined) preferences.outputVolume = clampVolume(update.outputVolume, 1);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
        /* Tùy chọn vẫn có hiệu lực khi trình duyệt chặn lưu trữ. */
    }
    listeners.forEach((listener) => listener());
}

export function setParticipantVolume(identity: string, volume: number) {
    updateCallPreferences({
        participantVolumes: Object.fromEntries(
            [...Object.entries(preferences.participantVolumes).filter(([key]) => key !== identity), [identity, clampVolume(volume)]].slice(-256),
        ),
    });
}
