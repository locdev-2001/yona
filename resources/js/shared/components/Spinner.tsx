// Port từ shared/components/Spinner.vue (style .spinner nằm trong app.scss)
interface SpinnerProps {
    size?: 'small' | 'tiny' | 'message' | '';
    colorScheme?: 'primary' | 'warning' | 'success' | '';
}

const COLOR_SCHEME_CLASSES: Record<string, string> = {
    primary: 'before:!border-t-n-brand',
    warning: 'before:!border-t-n-amber-6',
    success: 'before:!border-t-n-teal-9',
};

export default function Spinner({ size = 'small', colorScheme = '' }: SpinnerProps) {
    const colorSchemeClasses = COLOR_SCHEME_CLASSES[colorScheme] ?? colorScheme;

    return <span className={`spinner ${size} ${colorSchemeClasses}`} />;
}
