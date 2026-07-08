import AuthBrandPanel from '@/components/auth-brand-panel';
import { Card, CardContent } from '@/components/ui/card';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

// login-04 style: centered card, form column + on-brand blue panel (AuthBrandPanel).
// Shared by register, forgot/reset password, confirm password and verify email.
// Login mirrors this layout inline.
export default function AuthSplitCardLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <div className="flex flex-col gap-6">
                    <Card className="overflow-hidden p-0 shadow-sm">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            {/* Form column */}
                            <div className="flex flex-col gap-6 p-6 md:p-8">
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                                    {description && <p className="text-muted-foreground text-balance">{description}</p>}
                                </div>
                                {children}
                            </div>

                            <AuthBrandPanel />
                        </CardContent>
                    </Card>

                    <p className="text-muted-foreground px-6 text-center text-xs text-balance">
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
