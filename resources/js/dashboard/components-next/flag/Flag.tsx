import 'flag-icons/css/flag-icons.min.css';

// Port từ dashboard/components-next/flag/Flag.vue (flag-icons css).
interface FlagProps {
    country: string;
    squared?: boolean;
    className?: string;
}

export default function Flag({ country, squared = false, className = '' }: FlagProps) {
    const classes = ['fi', `fi-${country.toLowerCase()}`, 'flex-shrink-0', squared ? 'fis' : '', className]
        .filter(Boolean)
        .join(' ');

    return <span className={classes} />;
}
