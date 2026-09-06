// Port từ reports/components/CsatTableLoader.vue
export default function CsatTableLoader({ rows = 5 }: { rows?: number }) {
    return (
        <div className="p-6">
            <div className="space-y-4">
                <div className="flex gap-4 pb-3 border-b border-n-weak">
                    <div className="h-4 w-32 rounded bg-n-slate-3 animate-pulse" />
                    <div className="h-4 w-28 rounded bg-n-slate-3 animate-pulse" />
                    <div className="h-4 w-20 rounded bg-n-slate-3 animate-pulse" />
                    <div className="h-4 flex-1 rounded bg-n-slate-3 animate-pulse" />
                    <div className="h-4 w-20 rounded bg-n-slate-3 animate-pulse" />
                </div>

                {Array.from({ length: rows }, (_, index) => (
                    <div key={index} className="flex items-center gap-4 py-3">
                        <div className="flex items-center gap-2 w-48">
                            <div className="size-8 rounded-full bg-n-slate-3 animate-pulse" />
                            <div className="h-4 w-24 rounded bg-n-slate-3 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2 w-44">
                            <div className="size-8 rounded-full bg-n-slate-3 animate-pulse" />
                            <div className="h-4 w-20 rounded bg-n-slate-3 animate-pulse" />
                        </div>
                        <div className="h-7 w-24 rounded-lg bg-n-slate-3 animate-pulse" />
                        <div className="h-4 flex-1 rounded bg-n-slate-3 animate-pulse" />
                        <div className="h-4 w-16 rounded bg-n-slate-3 animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
