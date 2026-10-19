import type { ReactNode } from 'react';

// Icon của kit: đường nét lucide (ISC), vẽ inline để widget nhúng trên site khách
// không kéo thêm bundle icon. Tên theo lucide để dễ tra.

function Icon({ size = 18, children }: { size?: number; children: ReactNode }) {
    return (
        <svg className="mk-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            {children}
        </svg>
    );
}

type IconProps = { size?: number };

export const Copy = ({ size }: IconProps) => (
    <Icon size={size}>
        <rect x="8" y="8" width="14" height="14" rx="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
);

export const Check = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="M20 6 9 17l-5-5" />
    </Icon>
);

export const ArrowRight = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="M5 12h14M12 5l7 7-7 7" />
    </Icon>
);

export const Landmark = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z" />
    </Icon>
);

export const Mail = ({ size }: IconProps) => (
    <Icon size={size}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 5L2 7" />
    </Icon>
);
