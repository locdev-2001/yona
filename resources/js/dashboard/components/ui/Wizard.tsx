import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/components/ui/Wizard.vue — bước đang đứng lấy từ `activeRoute`
// thay cho route.name của vue-router.
export interface WizardItem {
    title: string;
    body: string;
    route: string;
}

interface WizardProps {
    items: WizardItem[];
    activeRoute: string;
    className?: string;
}

export default function Wizard({ items, activeRoute, className = '' }: WizardProps) {
    const foundIndex = items.findIndex(item => item.route === activeRoute);
    const activeIndex = foundIndex === -1 ? 0 : foundIndex;

    return (
        <div className={className}>
            {items.map((item, index) => {
                const isActive = index === activeIndex;
                const isOver = index < activeIndex;

                return (
                    <div
                        key={item.route}
                        className="cursor-pointer flex items-start gap-6 relative after:content-[''] after:absolute after:w-0.5 after:h-full after:top-5 ltr:after:left-4 rtl:after:right-4 before:content-[''] before:absolute before:w-0.5 before:h-4 before:top-0 before:left-4 rtl:before:right-4 last:after:hidden last:before:hidden after:bg-n-slate-3 before:bg-n-slate-3"
                    >
                        <div
                            className={`rounded-2xl flex-shrink-0 size-8 border-2 border-n-slate-3 flex items-center justify-center left-2 leading-4 z-10 top-5 transition-all duration-300 ease-in-out ${
                                isActive || isOver ? 'bg-n-slate-3' : 'bg-n-background'
                            }`}
                        >
                            {isOver ? (
                                <Icon icon="i-lucide-check" className="text-n-slate-11 size-4" />
                            ) : (
                                <span
                                    className={`text-xs font-bold transition-colors duration-300 ${
                                        isActive ? 'text-n-blue-11' : 'text-n-slate-11'
                                    }`}
                                >
                                    {index + 1}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col items-start gap-1.5 pb-10 pt-1">
                            <div className="flex items-center">
                                <h3
                                    className={`text-sm font-medium overflow-hidden whitespace-nowrap mt-0.5 text-ellipsis leading-tight ${
                                        isActive ? 'text-n-blue-11' : 'text-n-slate-12'
                                    }`}
                                >
                                    {item.title}
                                </h3>
                            </div>
                            <p className="m-0 mt-1.5 text-sm text-n-slate-11">{item.body}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
