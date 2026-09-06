import type { CSSProperties } from 'react';

import icons from './dashboard-icons.json';

// Port từ shared/components/FluentIcon/DashboardIcon.vue + Icon.vue —
// icon fluent inline SVG theo bộ dashboard-icons.json (copy nguyên từ tag).
interface FluentIconProps {
    icon: string;
    size?: string | number;
    type?: 'outline' | 'solid';
    viewBox?: string;
    className?: string;
    style?: CSSProperties;
}

const iconMap = icons as Record<string, string | string[]>;

export default function FluentIcon({
    icon,
    size = '20',
    type = 'outline',
    viewBox = '0 0 24 24',
    className = '',
    style,
}: FluentIconProps) {
    const path = iconMap[`${icon}-${type}`];
    if (!path) return null;
    const pathSource = Array.isArray(path) ? path : [path];

    return (
        <svg width={size} height={size} fill="none" viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
            {pathSource.map((source) => (
                <path key={source} d={source} fill="currentColor" />
            ))}
        </svg>
    );
}
