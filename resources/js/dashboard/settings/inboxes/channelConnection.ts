// Giao kèo kết nối kênh do backend khai (App\Channels\ChannelConnection::toArray).
// Màn "Thêm kênh" chỉ vẽ những lối vào backend gửi xuống — không tự ẩn/hiện theo loại kênh.
export type ConnectionMethod = 'qr' | 'oauth_redirect' | 'oauth_popup' | 'token' | 'form' | 'credentials';

export interface ChannelConnection {
    key: string;
    method: ConnectionMethod;
    available: boolean;
    // Lối đã lên kế hoạch nhưng chưa mở: hiện cho biết, không bấm được.
    coming_soon?: boolean;
    preset: Record<string, string | number | boolean> | null;
    guide_url: string | null;
    logo_url: string | null;
    start_url: string | null;
    options: ChannelConnection[];
}

// Luồng OAuth thất bại thì máy chủ quay về kèm `?oauth_error=denied|token|mismatch`.
const OAUTH_ERROR_KEYS: Record<string, string> = {
    denied: 'INBOX_MGMT.CONNECT_GUIDE.EMAIL.OAUTH_DENIED',
    token: 'INBOX_MGMT.CONNECT_GUIDE.EMAIL.OAUTH_TOKEN',
    mismatch: 'INBOX_MGMT.CONNECT_GUIDE.EMAIL.OAUTH_MISMATCH',
};

export function oauthErrorKey(search: string): string | null {
    const reason = new URLSearchParams(search).get('oauth_error');

    return reason ? (OAUTH_ERROR_KEYS[reason] ?? OAUTH_ERROR_KEYS.token) : null;
}
