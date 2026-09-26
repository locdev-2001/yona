import NextButton from 'dashboard/components-next/button/Button';

// Port từ dashboard/components/ui/Banner.vue: nhánh MessagesView dùng
// bannerMessage + hrefLink, nhánh ReplyBoxBanner dùng thêm nút hành động.
// Màu scheme + style link lấy đúng <style scoped> của Banner.vue.
interface BannerProps {
    bannerMessage: string;
    colorScheme?: 'primary' | 'secondary' | 'alert' | 'warning' | 'gray';
    hrefLink?: string;
    hrefLinkText?: string;
    className?: string;
    hasActionButton?: boolean;
    actionButtonLabel?: string;
    actionButtonIcon?: string;
    actionButtonVariant?: 'ghost' | 'faded' | 'solid';
    onPrimaryAction?: () => void;
}

// getButtonColor của bản gốc.
const BUTTON_COLOR: Record<string, 'blue' | 'ruby' | 'amber'> = {
    primary: 'blue',
    secondary: 'blue',
    alert: 'ruby',
    warning: 'amber',
};

// Bản gốc để `text-white` ở lớp base rồi ghi đè bằng style scoped `.banner.secondary`
// (hai class = độ đặc hiệu cao hơn). Utility Tailwind cùng độ đặc hiệu nên phải gom
// màu chữ vào đúng scheme thay vì đặt mặc định ở base.
const COLOR_SCHEME_CLASS: Record<string, string> = {
    primary: 'bg-n-brand text-white',
    secondary: 'bg-n-slate-3 text-n-slate-12',
    alert: 'bg-n-ruby-3 text-n-ruby-12',
    warning: 'bg-n-amber-5 text-n-amber-12',
    gray: 'text-n-gray-10',
};

const LINK_CLASS: Record<string, string> = {
    secondary: 'text-n-slate-12',
    alert: 'text-n-ruby-12',
    warning: 'text-n-amber-12',
};

export default function Banner({
    bannerMessage,
    colorScheme = 'gray',
    hrefLink,
    hrefLinkText,
    className = '',
    hasActionButton = false,
    actionButtonLabel = '',
    actionButtonIcon = 'i-lucide-arrow-right',
    actionButtonVariant = 'faded',
    onPrimaryAction,
}: BannerProps) {
    return (
        <div
            className={`flex items-center justify-center h-12 gap-4 px-4 py-3 text-xs banner ${
                COLOR_SCHEME_CLASS[colorScheme] ?? ''
            } ${className}`}
        >
            <span className="banner-message flex items-center">
                {bannerMessage}
                {hrefLink ? (
                    <a
                        href={hrefLink}
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                        className={`ml-1 underline text-xs ${LINK_CLASS[colorScheme] ?? 'text-n-amber-12'}`}
                    >
                        {hrefLinkText}
                    </a>
                ) : null}
            </span>
            <div className="actions">
                {hasActionButton ? (
                    <NextButton
                        xs
                        icon={actionButtonIcon}
                        variant={actionButtonVariant}
                        color={BUTTON_COLOR[colorScheme] ?? 'blue'}
                        label={actionButtonLabel}
                        onClick={onPrimaryAction}
                    />
                ) : null}
            </div>
        </div>
    );
}
