import { cn } from './cn';

export function initials(name: string): string {
    const words = name.trim().split(/[\s@._-]+/).filter(Boolean);
    const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2);

    return letters.toUpperCase();
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-console-accent text-xs font-semibold text-console-accent-foreground',
                className,
            )}
        >
            {src ? <img src={src} alt="" className="size-full object-cover" /> : <span aria-hidden="true">{initials(name)}</span>}
        </span>
    );
}
