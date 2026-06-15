import AppLogoIcon from '@/components/app-logo-icon';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

// On-brand blue panel shared by the login page and the split-card auth layout.
// Single source of truth for the auth visual identity.
export default function AuthBrandPanel() {
    const { name, quote } = usePage<SharedData>().props;

    return (
        <div className="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-10 md:flex">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-blue-950/40" />
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" />

            <Link href={route('home')} className="relative flex items-center gap-2 text-lg font-medium">
                <AppLogoIcon className="size-8 fill-current text-white" />
                {name}
            </Link>

            <div className="relative flex flex-col gap-6">
                <h2 className="text-2xl leading-snug font-semibold tracking-tight text-balance">Every customer, deal, and follow-up in one place.</h2>
                {quote && (
                    <blockquote className="border-l-2 border-white/30 pl-4">
                        <p className="text-primary-foreground/90 leading-relaxed text-balance">&ldquo;{quote.message}&rdquo;</p>
                        <footer className="text-primary-foreground/60 mt-2 text-sm">{quote.author}</footer>
                    </blockquote>
                )}
            </div>
        </div>
    );
}
