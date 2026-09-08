import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import { buildSearch, getAuthToken } from '../api/client';

// Echo của khách: cùng cấu hình Reverb như dashboard nhưng ký kênh qua
// `/api/v1/widget/broadcasting/auth` với header X-Auth-Token và KHÔNG gửi cookie —
// widget chạy trong iframe trên tên miền khách nên cookie bên thứ ba hay bị chặn
// (c2-notes-be §Realtime).
interface BroadcastAuthResponse {
    auth: string;
    channel_data?: string;
}

export const WIDGET_BROADCASTING_AUTH_ENDPOINT = '/api/v1/widget/broadcasting/auth';

export function createWidgetEcho(): Echo<'reverb'> {
    const env = import.meta.env;
    const scheme = env.VITE_REVERB_SCHEME ?? 'http';
    const port = Number(env.VITE_REVERB_PORT ?? 8611);

    return new Echo({
        broadcaster: 'reverb',
        Pusher,
        key: env.VITE_REVERB_APP_KEY,
        wsHost: env.VITE_REVERB_HOST ?? window.location.hostname,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: WIDGET_BROADCASTING_AUTH_ENDPOINT,
        authorizer: (channel: { name: string }) => ({
            authorize(socketId: string, callback: (error: Error | null, data: BroadcastAuthResponse | null) => void) {
                fetch(`${WIDGET_BROADCASTING_AUTH_ENDPOINT}${buildSearch()}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Auth-Token': getAuthToken(),
                    },
                    credentials: 'omit',
                    body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
                })
                    .then(response => (response.ok ? response.json() : Promise.reject(new Error('auth failed'))))
                    .then((data: BroadcastAuthResponse) => callback(null, data))
                    .catch((error: Error) => callback(error, null));
            },
        }),
    });
}
