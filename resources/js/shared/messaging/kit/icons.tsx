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

export const ChevronRight = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="m9 18 6-6-6-6" />
    </Icon>
);

export const ChevronLeft = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="m15 18-6-6 6-6" />
    </Icon>
);

export const ExternalLink = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Icon>
);

export const Phone = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </Icon>
);

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

export const BookOpen = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Icon>
);

export const Calendar = ({ size }: IconProps) => (
    <Icon size={size}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
    </Icon>
);

export const Truck = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.7a1 1 0 0 0-.2-.6l-3.5-4.3A1 1 0 0 0 17.5 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
    </Icon>
);

export const ShoppingBag = ({ size }: IconProps) => (
    <Icon size={size}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
    </Icon>
);

export const ClipboardList = ({ size }: IconProps) => (
    <Icon size={size}>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01" />
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
