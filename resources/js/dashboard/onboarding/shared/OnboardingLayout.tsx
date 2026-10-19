import type { ReactNode } from 'react';

import NextButton from 'dashboard/components-next/button/Button';

// Port từ dashboard/routes/dashboard/onboarding/shared/OnboardingLayout.vue
interface OnboardingLayoutProps {
    greeting: string;
    subtitle?: string;
    continueLabel?: string;
    isLoading?: boolean;
    disabled?: boolean;
    children: ReactNode;
}

export default function OnboardingLayout({
    greeting,
    subtitle = '',
    continueLabel = 'Continue',
    isLoading = false,
    disabled = false,
    children,
}: OnboardingLayoutProps) {
    return (
        <div className="relative flex text-body-main items-start justify-center w-full min-h-screen bg-n-surface-2 py-12 px-4 overflow-hidden">
            {/* Grid background with corner fade */}
            <div className="absolute inset-0 bg-[size:96px_96px] bg-[image:linear-gradient(to_right,rgb(var(--border-weak))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border-weak))_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_80%_at_100%_0%,black_5%,transparent_50%),radial-gradient(ellipse_80%_80%_at_0%_100%,black_5%,transparent_50%)] [mask-composite:add] [-webkit-mask-composite:source-over]" />
            <div className="relative w-full max-w-[40rem]">
                <div className="relative ps-12">
                    {/* Timeline dotted line */}
                    <svg
                        className="absolute start-[16px] top-10 bottom-20 overflow-visible text-n-slate-5"
                        width="1"
                        height="100%"
                        preserveAspectRatio="none"
                    >
                        <line x1="0" y1="0" x2="0" y2="97%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    </svg>

                    {/* Greeting */}
                    <div className="mb-6 -ms-12 flex items-start gap-4">
                        <div className="flex items-center justify-center w-8 h-8 z-10 flex-shrink-0">
                            <span className="i-yona-onboarding-greeting size-4 text-n-slate-7" />
                        </div>
                        <div>
                            <h1 className="text-heading-1 text-n-slate-12">{greeting}</h1>
                            {subtitle ? <p className="text-sm text-n-slate-11">{subtitle}</p> : null}
                        </div>
                    </div>

                    {/* Sections */}
                    {children}
                </div>

                {/* Continue button with curved connector */}
                <div className="relative ps-12 overflow-visible">
                    <svg
                        width="48"
                        height="40"
                        viewBox="0 0 47 40"
                        fill="none"
                        className="absolute start-0 top-0 overflow-visible rtl:-scale-x-100"
                    >
                        <defs>
                            <linearGradient id="line-gradient" x1="15" y1="0" x2="48" y2="20" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="rgb(var(--slate-5))" />
                                <stop offset="100%" stopColor="rgb(var(--blue-9))" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M15.5 0 C15.5 24, 15.5 20, 48 20"
                            stroke="url(#line-gradient)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                            fill="none"
                        />
                    </svg>
                    <svg
                        width="6"
                        height="6"
                        viewBox="0 0 6 6"
                        fill="none"
                        className="absolute start-[42px] top-1/2 -translate-y-1/2 z-10 rtl:-scale-x-100"
                    >
                        <path d="M6 0L0 3L6 6Z" fill="rgb(var(--blue-9))" />
                    </svg>
                    <div className="flex items-center gap-3">
                        <NextButton
                            type="submit"
                            blue
                            isLoading={isLoading}
                            disabled={disabled}
                            className="w-full justify-center"
                        >
                            {continueLabel}
                        </NextButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
