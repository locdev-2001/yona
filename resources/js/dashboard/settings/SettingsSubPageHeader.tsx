import SanitizedHtml from 'shared/components/SanitizedHtml';

// Port từ dashboard/routes/dashboard/settings/SettingsSubPageHeader.vue
interface SettingsSubPageHeaderProps {
    headerTitle?: string;
    headerContent?: string;
    className?: string;
}

export default function SettingsSubPageHeader({
    headerTitle = '',
    headerContent = '',
    className = '',
}: SettingsSubPageHeaderProps) {
    return (
        <div className={`flex flex-col gap-1.5 w-full items-start mb-4 ${className}`}>
            <h2 className="text-heading-1 text-n-slate-12 break-words">{headerTitle}</h2>
            <SanitizedHtml as="p" className="text-body-main w-full text-n-slate-11" html={headerContent} />
        </div>
    );
}
