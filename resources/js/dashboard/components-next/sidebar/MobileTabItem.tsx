import Icon from 'dashboard/components-next/icon/Icon';

const BADGE_LIMIT = 99;

// Một ô của thanh tab điện thoại: dùng chung cho tab chuyển trang, nút Tìm kiếm và nút Thông báo
// để vùng chạm, cỡ chữ và huy hiệu chỉ khai một chỗ.
export function mobileTabClassName(isActive: boolean): string {
    return `relative flex flex-col items-center justify-center gap-0.5 w-full h-[59px] min-w-0 px-0.5 text-xs ${
        isActive ? 'text-n-blue-11 font-medium' : 'text-n-slate-11'
    }`;
}

interface MobileTabContentProps {
    icon: string;
    label: string;
    badgeCount?: number;
    badgeLabel?: string;
}

export function MobileTabContent({ icon, label, badgeCount = 0, badgeLabel }: MobileTabContentProps) {
    return (
        <>
            <Icon icon={icon} className="size-5 shrink-0" />
            <span className="max-w-full truncate">{label}</span>
            {badgeCount > 0 ? (
                <span
                    className="absolute top-1.5 start-[calc(50%+0.25rem)] grid place-content-center min-w-4 h-4 px-1 rounded-full bg-n-brand text-xxs leading-none text-white tabular-nums"
                    aria-label={badgeLabel}
                >
                    {badgeCount > BADGE_LIMIT ? `${BADGE_LIMIT}+` : badgeCount}
                </span>
            ) : null}
        </>
    );
}
