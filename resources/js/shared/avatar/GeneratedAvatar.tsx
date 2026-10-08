import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import 'blobatar/motion.css';
import 'blobatar/gaze.css';

import { avatarExpression } from './avatarMood';
import { resolveAvatarIdentity } from './avatarSeed';

// Đơn vị viewBox (khuôn mặt rộng 100). Cao hơn mức 1.5–4 thư viện gợi ý để avatar
// nhỏ trong danh sách vẫn thấy rõ mắt đưa theo con trỏ.
const GAZE_TRAVEL = 18;

// Thân khối chỉ chiếm khoảng nửa viewBox: phóng cho khuôn mặt đầy khung. Đặt ở thẻ
// bọc vì className truyền vào Blobatar thay mất class chuyển động của thư viện.
const FACE_FRAME_CLASS = 'block size-full scale-[1.3] [&>*]:block [&>*]:size-full';

interface GeneratedAvatarProps {
    // Định danh bền dựng bằng avatarSeed(); thiếu thì dựng theo tên.
    seed?: string;
    name?: string | null;
    // Bỏ trống thì CSS của nơi chứa quyết định cỡ.
    size?: number;
    alt?: string;
    className?: string;
    // Nơi chứa bật khi người dùng đang trỏ vào nó (vd thẻ hội thoại): chớp, liếc, nhìn theo con trỏ.
    animated?: boolean;
}

interface FaceProps {
    identity: string;
    size?: number;
}

function StillFace({ identity, size }: FaceProps) {
    return (
        <Blobatar
            name={identity}
            size={size}
            background="square"
            expression={avatarExpression(identity)}
            alt=""
            draggable={false}
        />
    );
}

function LivelyFace({ identity, size }: FaceProps) {
    const { ref } = useGaze({ travel: GAZE_TRAVEL, lookAt: 'pointer' });

    return (
        <Blobatar
            ref={ref}
            name={identity}
            size={size}
            background="square"
            animate="always"
            expression={avatarExpression(identity)}
            aria-hidden="true"
        />
    );
}

/**
 * Avatar hình khối tất định cho chủ thể chưa có ảnh: cùng định danh luôn ra cùng
 * một hình và một biểu cảm. Mặc định là ảnh tĩnh (danh sách dài không tốn gì);
 * chỉ chuyển động khi nơi chứa bật `animated`. Nền vuông phủ kín để khung bo góc
 * của nơi chứa cắt ra đúng hình.
 */
export default function GeneratedAvatar({
    seed,
    name,
    size,
    alt = '',
    className = '',
    animated = false,
}: GeneratedAvatarProps) {
    const identity = resolveAvatarIdentity(seed, name);

    return (
        <span
            role="img"
            aria-label={alt}
            data-generated-avatar={identity}
            className={`block size-full overflow-hidden select-none ${className}`.trim()}
        >
            <span className={FACE_FRAME_CLASS}>
                {animated ? <LivelyFace identity={identity} size={size} /> : <StillFace identity={identity} size={size} />}
            </span>
        </span>
    );
}
