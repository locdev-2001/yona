// Port từ dashboard/components/ui/Banner.vue (nhánh MessagesView dùng:
// bannerMessage + hrefLink; action/close button chưa màn nào cần).
// Màu scheme + style link lấy đúng <style scoped> của Banner.vue.
interface BannerProps {
    bannerMessage: string;
    colorScheme?: 'primary' | 'secondary' | 'alert' | 'warning' | 'gray';
    hrefLink?: string;
    hrefLinkText?: string;
    className?: string;
}

const COLOR_SCHEME_CLASS: Record<string, string> = {
    primary: 'bg-n-brand',
    secondary: 'bg-n-slate-3 dark:bg-n-solid-3 text-n-slate-12',
    alert: 'bg-n-ruby-3 text-n-ruby-12',
    warning: 'bg-n-amber-5 text-n-amber-12',
    gray: 'text-n-gray-10 dark:text-n-gray-10',
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
}: BannerProps) {
    return (
        <div
            className={`flex items-center justify-center h-12 gap-4 px-4 py-3 text-xs text-white banner dark:text-white ${
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
        </div>
    );
}
