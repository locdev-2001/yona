import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import { postJson } from 'dashboard/helper/apiClient';

// Thay createConsumer('/cable') của @rails/actioncable bằng Echo + Reverb.
// Auth kênh private đi qua postJson để tái dùng session + X-XSRF-TOKEN của apiClient.
interface BroadcastAuthResponse {
    auth: string;
    channel_data?: string;
}

export const BROADCASTING_AUTH_ENDPOINT = '/broadcasting/auth';

export function createEcho(): Echo<'reverb'> {
    const env = import.meta.env;
    const scheme = env.VITE_REVERB_SCHEME ?? 'http';
    const port = Number(env.VITE_REVERB_PORT ?? 8080);

    return new Echo({
        broadcaster: 'reverb',
        Pusher,
        key: env.VITE_REVERB_APP_KEY,
        wsHost: env.VITE_REVERB_HOST ?? window.location.hostname,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: BROADCASTING_AUTH_ENDPOINT,
        authorizer: (channel: { name: string }) => ({
            authorize(socketId: string, callback: (error: Error | null, data: BroadcastAuthResponse | null) => void) {
                postJson<BroadcastAuthResponse>(BROADCASTING_AUTH_ENDPOINT, {
                    socket_id: socketId,
                    channel_name: channel.name,
                })
                    .then(response => callback(null, response))
                    .catch(error => callback(error as Error, null));
            },
        }),
    });
}
