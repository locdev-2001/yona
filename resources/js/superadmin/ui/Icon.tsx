import { cn } from './cn';

// `name` là class icon của Tailwind (vd. `i-lucide-search`), phải viết nguyên văn
// trong mã nguồn để Tailwind sinh ra.
export function Icon({ name, className }: { name: string; className?: string }) {
    return <span aria-hidden="true" className={cn('inline-block size-4 shrink-0', name, className)} />;
}
