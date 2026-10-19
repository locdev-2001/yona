import { LEGACY_DASHBOARD_APP_FETCH_INFO } from 'shared/legacyContracts';

// App nhúng dashboard gửi chuỗi này qua postMessage để xin lại `appContext`.
export const DASHBOARD_APP_FETCH_INFO = 'yona-dashboard-app:fetch-info';

// App nhúng viết theo tên đời trước vẫn được trả lời.
export const isFetchInfoRequest = (data: unknown): boolean =>
    data === DASHBOARD_APP_FETCH_INFO || data === LEGACY_DASHBOARD_APP_FETCH_INFO;
