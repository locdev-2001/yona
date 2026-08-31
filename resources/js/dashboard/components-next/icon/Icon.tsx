import type { ComponentType, ReactNode } from 'react';

interface IconProps {
    icon: string | ComponentType | ReactNode;
    className?: string;
}

// Port từ dashboard/components-next/icon/Icon.vue
export default function Icon({ icon, className }: IconProps) {
    if (!icon) return null;

    if (typeof icon === 'string') {
        return <span className={[icon, className].filter(Boolean).join(' ')} />;
    }

    if (typeof icon === 'function') {
        const Component = icon as ComponentType<{ className?: string }>;
        return <Component className={className} />;
    }

    return <>{icon}</>;
}
