// Giao kèo kết nối kênh do backend khai (App\Channels\ChannelConnection::toArray).
// Màn "Thêm kênh" chỉ vẽ những lối vào backend gửi xuống — không tự ẩn/hiện theo loại kênh.
export type ConnectionMethod = 'qr' | 'oauth_redirect' | 'oauth_popup' | 'token' | 'form';

export interface ChannelConnection {
    key: string;
    method: ConnectionMethod;
    available: boolean;
    preset: Record<string, string | number | boolean> | null;
    guide_url: string | null;
    start_url: string | null;
    options: ChannelConnection[];
}

