// Điểm duy nhất quyết định "phiên đăng nhập còn sống không" khi một request JSON
// bị từ chối. 401 có thể chỉ là thiếu quyền, 419 có thể chỉ là token CSRF cũ, nên
// hỏi lại máy chủ trước khi kết luận thay vì đoán theo mã lỗi.

// GET trong nhóm `auth` của web_api: 200 = phiên còn, 401 = phiên đã mất. Đi qua
// middleware CSRF nên dù 200 hay 401 cũng cấp lại cookie XSRF-TOKEN mới.
const SESSION_PROBE_URL = '/api/v1/profile';
const SESSION_CHALLENGE_STATUSES = [401, 419];
const CSRF_TOKEN_MISMATCH_STATUS = 419;

type SessionState = 'alive' | 'expired' | 'unknown';

let sessionProbeInFlight: Promise<SessionState> | null = null;
let sessionExpiredHandled = false;

async function requestSessionState(): Promise<SessionState> {
    try {
        const response = await fetch(SESSION_PROBE_URL, {
            method: 'GET',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        });
        if (response.ok) return 'alive';
        return response.status === 401 ? 'expired' : 'unknown';
    } catch {
        return 'unknown';
    }
}

// Nhiều request hỏng cùng lúc (heartbeat, danh sách, auth kênh realtime) dùng
// chung một lần hỏi.
function probeSession(): Promise<SessionState> {
    sessionProbeInFlight ??= requestSessionState().finally(() => {
        sessionProbeInFlight = null;
    });
    return sessionProbeInFlight;
}

// Tải lại chính trang đang mở: máy chủ chuyển về màn đăng nhập và nhớ URL này, nên
// đăng nhập xong người dùng quay về đúng chỗ (bản nháp trả lời nằm ở localStorage).
function handleSessionExpired(): void {
    if (sessionExpiredHandled) return;
    sessionExpiredHandled = true;
    window.location.reload();
}

// `send` phải tự dựng header (kể cả X-XSRF-TOKEN) mỗi lần gọi để lần gửi lại đọc
// được token mới. Gửi lại sau 419 an toàn vì CSRF chặn trước khi controller chạy.
// 419 được gửi lại một lần cả khi phiên đã mất: endpoint cho khách (quên mật khẩu,
// đặt mật khẩu mới) chỉ cần token mới; endpoint cần đăng nhập sẽ trả 401 và khi đó
// mới tải lại trang.
export async function sendWithSessionRecovery(send: () => Promise<Response>): Promise<Response> {
    const response = await send();
    if (!SESSION_CHALLENGE_STATUSES.includes(response.status)) return response;
    if (sessionExpiredHandled) return response;

    const sessionState = await probeSession();
    if (sessionState === 'unknown') return response;

    const settledResponse = response.status === CSRF_TOKEN_MISMATCH_STATUS ? await send() : response;
    if (sessionState === 'expired' && SESSION_CHALLENGE_STATUSES.includes(settledResponse.status)) {
        handleSessionExpired();
    }

    return settledResponse;
}
