import { useEffect, useRef } from 'react';
import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import 'blobatar/motion.css';
import 'blobatar/gaze.css';

import { avatarExpression } from './avatarMood';
import { resolveAvatarIdentity } from './avatarSeed';
import type { AvatarTraits } from './avatarSeed';
import { watchPointerProximity } from './pointerProximity';

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
    // Nơi chứa bật khi người dùng đang trỏ vào nó (vd thẻ hội thoại): chớp, liếc, nhún.
    animated?: boolean;
    // Trục đã ghim trong AvatarEditor; thiếu thì cả hình theo seed.
    traits?: AvatarTraits | null;
}

/**
 * Avatar hình khối tất định cho chủ thể chưa có ảnh: cùng định danh luôn ra cùng
 * một hình và một biểu cảm. Mắt luôn nhìn theo con trỏ khi con trỏ ở gần; chớp,
 * liếc, nhún chỉ chạy khi nơi chứa bật `animated` (chế độ `hover` của thư viện giữ
 * các chuyển động đó tạm dừng nhưng ánh mắt vẫn điều khiển được). Nền vuông phủ kín
 * để khung bo góc của nơi chứa cắt ra đúng hình.
 */
export default function GeneratedAvatar({
    seed,
    name,
    size,
    alt = '',
    className = '',
    animated = false,
    traits = null,
}: GeneratedAvatarProps) {
    const identity = resolveAvatarIdentity(seed, name);
    const frameRef = useRef<HTMLSpanElement>(null);
    const { ref: gazeRef, lookAt } = useGaze({ travel: GAZE_TRAVEL });

    useEffect(() => {
        if (!frameRef.current) return undefined;
        return watchPointerProximity(frameRef.current, isNear => lookAt(isNear ? 'pointer' : null));
    }, [lookAt]);

    return (
        <span
            ref={frameRef}
            role="img"
            aria-label={alt}
            data-generated-avatar={identity}
            className={`block size-full overflow-hidden select-none ${className}`.trim()}
        >
            <span className={FACE_FRAME_CLASS}>
                <Blobatar
                    ref={gazeRef}
                    name={identity}
                    size={size}
                    background="square"
                    animate={animated ? 'always' : 'hover'}
                    expression={avatarExpression(identity)}
                    traits={traits ?? undefined}
                    aria-hidden="true"
                />
            </span>
        </span>
    );
}
