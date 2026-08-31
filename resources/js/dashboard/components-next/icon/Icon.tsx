import type { ComponentType, CSSProperties, ReactNode } from 'react';

interface IconProps {
    icon: string | ComponentType | ReactNode;
    className?: string;
    style?: CSSProperties;
}

// Port từ dashboard/components-next/icon/Icon.vue
export default function Icon({ icon, className, style }: IconProps) {
    if (!icon) return null;

    if (typeof icon === 'string') {
        return <span className={[icon, className].filter(Boolean).join(' ')} style={style} />;
    }

    if (typeof icon === 'function') {
        const Component = icon as ComponentType<{ className?: string }>;
        return <Component className={className} />;
    }

    return <>{icon}</>;
}
