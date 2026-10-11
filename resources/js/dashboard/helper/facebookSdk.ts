// Port từ dashboard/helper/facebookScopes.js + phần dùng chung của
// settings/inbox/channels/whatsapp/utils.js (nạp SDK Meta rồi FB.init).
// Chỉ port những gì luồng kết nối trang Facebook cần; embedded signup của
// WhatsApp chưa port.
export const FACEBOOK_PAGE_SCOPES = [
    'pages_manage_metadata',
    'business_management',
    'pages_messaging',
    'pages_show_list',
    'pages_read_engagement',
];

export const INSTAGRAM_SCOPES = ['instagram_basic', 'instagram_manage_messages'];

export function buildFacebookLoginScopes({ includeInstagramScopes = false } = {}): string {
    const scopes = [...FACEBOOK_PAGE_SCOPES];
    if (includeInstagramScopes) scopes.push(...INSTAGRAM_SCOPES);

    return scopes.join(',');
}

export class ScriptLoaderError extends Error {
    constructor(src: string) {
        super(`Failed to load script: ${src}`);
        this.name = 'ScriptLoaderError';
    }
}

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

function loadFacebookSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);

        if (existing) {
            if (existing.dataset.loaded === 'true') resolve();
            else existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new ScriptLoaderError(SDK_SRC)));

            return;
        }

        const script = document.createElement('script');
        script.src = SDK_SRC;
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        });
        script.addEventListener('error', () => reject(new ScriptLoaderError(SDK_SRC)));
        script.addEventListener('abort', () => reject(new ScriptLoaderError(SDK_SRC)));
        document.head.appendChild(script);
    });
}

function initializeFacebook(appId: string, apiVersion: string): Promise<void> {
    return new Promise(resolve => {
        const init = () => {
            window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: apiVersion });
            resolve();
        };

        if (window.FB) init();
        else window.fbAsyncInit = init;
    });
}

export async function setupFacebookSdk(appId: string, apiVersion: string): Promise<void> {
    await loadFacebookSdk();
    await initializeFacebook(appId, apiVersion);
}

interface FacebookLoginResponse {
    status: string;
    authResponse?: { accessToken?: string };
}

declare global {
    interface Window {
        FB: {
            init: (options: Record<string, unknown>) => void;
            login: (
                callback: (response: FacebookLoginResponse) => void,
                options: { scope: string },
            ) => void;
        };
        fbAsyncInit?: () => void;
    }
}
