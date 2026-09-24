// Tên công khai đời trước của SDK nhúng và app nhúng dashboard. Mã nhúng khách đã dán lên
// website và app nhúng của khách vẫn gọi các tên này, nên chúng sống ở đúng file này và
// không import gì (bundle SDK nạp file bằng đường dẫn tương đối).
export const LEGACY_SDK_GLOBAL = 'chatwootSDK';
export const LEGACY_SETTINGS_GLOBAL = 'chatwootSettings';
export const LEGACY_INSTANCE_GLOBAL = '$chatwoot';
export const LEGACY_EVENT_PREFIX = 'chatwoot';
export const LEGACY_FRAME_MESSAGE_PREFIX = 'chatwoot-widget:';
export const LEGACY_DASHBOARD_APP_FETCH_INFO = 'chatwoot-dashboard-app:fetch-info';

const legacyGlobals = (): Record<string, unknown> => window as unknown as Record<string, unknown>;

export const readLegacySdkSettings = (): Record<string, unknown> =>
    (legacyGlobals()[LEGACY_SETTINGS_GLOBAL] as Record<string, unknown> | undefined) ?? {};

export const exposeLegacySdk = (sdk: unknown): void => {
    legacyGlobals()[LEGACY_SDK_GLOBAL] = sdk;
};

export const exposeLegacySdkInstance = (instance: unknown): void => {
    legacyGlobals()[LEGACY_INSTANCE_GLOBAL] = instance;
};
