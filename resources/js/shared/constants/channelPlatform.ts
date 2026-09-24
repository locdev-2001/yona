// Bản sao FE của App\Channels\ChannelPlatform::toArray() — kênh tự khai nền tảng
// (logo + tên thương hiệu), lõi UI không map theo `channel_type`.
export interface ChannelPlatform {
    key: string;
    name: string;
    logo_url: string;
}
