import AppLogoIcon from '@/components/app-logo-icon';
import { Card, CardContent } from '@/components/ui/card';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

// login-04 style: centered card, form column + brand panel. Brand panel
// stands in for the block's image until a real asset exists.
export default function AuthSplitCardLayout({ children, title, description }: AuthLayoutProps) {
    const { name, quote } = usePage<SharedData>().props;

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-4 p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                <div className="flex flex-col gap-6">
                    <Card className="overflow-hidden shadow-sm">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            {/* Form column */}
                            <div className="flex flex-col gap-6 p-6 md:p-8">
                                <Link href={route('home')} className="flex items-center gap-2 font-medium">
                                    <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
                                        <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
                                    </div>
                                    <span>{name}</span>
                                </Link>
                                <div className="flex flex-col gap-1">
                                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                                    {description && <p className="text-muted-foreground text-sm text-balance">{description}</p>}
                                </div>
                                {children}
                            </div>

                            {/* Brand panel (stands in for the image) */}
                            <div className="bg-primary text-primary-foreground relative hidden flex-col justify-between p-10 md:flex">
                                <Link href={route('home')} className="flex items-center gap-2 text-lg font-medium">
                                    <AppLogoIcon className="size-8 fill-current text-white" />
                                    {name}
                                </Link>
                                {quote && (
                                    <blockquote className="space-y-2">
                                        <p className="text-lg leading-relaxed text-balance">&ldquo;{quote.message}&rdquo;</p>
                                        <footer className="text-primary-foreground/70 text-sm">{quote.author}</footer>
                                    </blockquote>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-muted-foreground text-center text-xs text-balance">
                        By continuing you agree to our{' '}
                        <a href="#" className="hover:text-primary underline underline-offset-4">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="#" className="hover:text-primary underline underline-offset-4">
                            Privacy Policy
                        </a>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}
