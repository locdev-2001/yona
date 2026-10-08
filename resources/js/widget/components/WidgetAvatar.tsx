import { useState } from 'react';

import GeneratedAvatar from 'shared/avatar/GeneratedAvatar';

interface WidgetAvatarProps {
    name: string;
    // Định danh bền (avatarSeed) để cùng một nhân viên ra cùng một hình như ở dashboard.
    seed?: string;
    src?: string | null;
    size: number;
}

export default function WidgetAvatar({ name, seed, src, size }: WidgetAvatarProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const dimension = { width: size, height: size };

    if (src && failedSrc !== src) {
        return (
            <img
                className="object-cover rounded-full flex-shrink-0"
                style={dimension}
                src={src}
                alt=""
                onError={() => setFailedSrc(src)}
            />
        );
    }

    return (
        <span aria-hidden="true" className="flex-shrink-0 overflow-hidden rounded-full" style={dimension}>
            <GeneratedAvatar seed={seed} name={name} size={size} />
        </span>
    );
}
