import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { initials } from './message-types';

interface ChatAvatarProps {
    name: string | null | undefined;
    src?: string | null;
    className?: string;
}

/** Avatar with image, falling back to name initials. Reused across inbox surfaces. */
export function ChatAvatar({ name, src, className }: ChatAvatarProps) {
    return (
        <Avatar className={cn('h-8 w-8', className)}>
            {src ? <AvatarImage src={src} alt={name ?? ''} /> : null}
            <AvatarFallback className="text-[11px]">{initials(name)}</AvatarFallback>
        </Avatar>
    );
}
