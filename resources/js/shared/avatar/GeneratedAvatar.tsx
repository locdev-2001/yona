import { useEffect, useRef } from 'react';
import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import 'blobatar/motion.css';
import 'blobatar/gaze.css';

import { avatarExpression } from './avatarMood';
import { resolveAvatarIdentity } from './avatarSeed';
import { watchPointerProximity } from './pointerProximity';

// Đơn vị viewBox (khuôn mặt rộng 100). Cao hơn mức 1.5–4 thư viện gợi ý để avatar
// nhỏ trong danh sách vẫn thấy rõ mắt đưa theo con trỏ.
const GAZE_TRAVEL = 18;

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
 * một hình và một biểu cảm. Mắt nhìn theo con trỏ khi con trỏ ở gần, xa ra thì về
 * nhịp liếc tự nhiên. Khuôn mặt phóng cho đầy khung vì thân khối chỉ chiếm khoảng
 * nửa viewBox; nền vuông phủ kín để khung bo góc của nơi chứa cắt ra đúng hình.
 */
export default function GeneratedAvatar({ seed, name, size, alt = '', className = '' }: GeneratedAvatarProps) {
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
            <Blobatar
                ref={gazeRef}
                name={identity}
                size={size}
                background="square"
                animate="always"
                expression={avatarExpression(identity)}
                aria-hidden="true"
                className="block size-full scale-[1.3]"
            />
        </span>
    );
}
