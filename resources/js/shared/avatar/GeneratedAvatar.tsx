import { Blobatar } from '@blobatar/react';

import { resolveAvatarIdentity } from './avatarSeed';

interface GeneratedAvatarProps {
    // Định danh bền dựng bằng avatarSeed(); thiếu thì dựng theo tên.
    seed?: string;
    name?: string | null;
    // Bỏ trống thì CSS của nơi chứa quyết định cỡ.
    size?: number;
    alt?: string;
    className?: string;
}

/**
 * Avatar hình khối tất định cho chủ thể chưa có ảnh: cùng định danh luôn ra cùng
 * một hình. Nền vuông phủ kín để khung bo góc của nơi chứa cắt ra đúng hình dạng.
 * Không animate: avatar nằm trong danh sách dài, render dạng <img> nhẹ nhất.
 */
export default function GeneratedAvatar({ seed, name, size, alt = '', className = '' }: GeneratedAvatarProps) {
    return (
        <Blobatar
            name={resolveAvatarIdentity(seed, name)}
            size={size}
            background="square"
            alt={alt}
            draggable={false}
            data-generated-avatar=""
            className={`block select-none ${className}`.trim()}
        />
    );
}
