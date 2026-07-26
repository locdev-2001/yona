/**
 * Danh tính kênh, do backend đẩy xuống qua prop `channelDescriptors`.
 *
 * Giao diện KHÔNG được biết tên kênh nào tồn tại. Cần nhãn, ký hiệu, đường tới
 * trang kết nối hay khóa hạn mức thì hỏi ở đây — thêm kênh mới là không sửa
 * dòng nào trong FE.
 */
export interface ChannelDescriptor {
    key: string;
    label: string;
    category: string;
    logo: string;
    badge: string;
    /** `null` = kênh không có trang kết nối riêng ⇒ giao diện phải ẩn nút. */
    connectRouteName: string | null;
    quotaKey: string;
}

export type ChannelDescriptorMap = Record<string, ChannelDescriptor>;

/**
 * Descriptor của một kênh, có phương án dự phòng khi backend chưa biết kênh đó.
 *
 * Xảy ra thật: hội thoại cũ của một kênh vừa bị tắt vẫn nằm trong hộp thư, mà
 * kênh tắt thì descriptor không còn. Trả về `undefined` là chỗ nào cũng phải
 * `?.` — nên trả một bản tối giản dựng từ chính khóa kênh.
 */
export function descriptorFor(descriptors: ChannelDescriptorMap | undefined, channel: string): ChannelDescriptor {
    return (
        descriptors?.[channel] ?? {
            key: channel,
            label: channel,
            category: 'chat',
            logo: '',
            badge: channel.charAt(0).toUpperCase() || '?',
            // Không đoán tên route: gọi `route()` với tên chưa đăng ký thì Ziggy
            // ném lỗi lúc chạy và cả trang trắng.
            connectRouteName: null,
            quotaKey: `quota.conversations.${channel}`,
        }
    );
}
