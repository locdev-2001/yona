import Button from 'dashboard/components-next/button/Button';

// Port từ routes/dashboard/inbox/components/PaginationButton.vue.
interface PaginationButtonProps {
    totalLength: number;
    currentIndex: number;
    onPrev: () => void;
    onNext: () => void;
}

export default function PaginationButton({ totalLength, currentIndex, onPrev, onNext }: PaginationButtonProps) {
    const isUpDisabled = currentIndex === 1;
    const isDownDisabled = currentIndex === totalLength || totalLength <= 1;

    return (
        <div className="flex gap-2 items-center">
            <div className="flex gap-1 items-center">
                <Button
                    icon="i-lucide-chevron-up"
                    xs
                    slate
                    faded
                    disabled={isUpDisabled}
                    onClick={() => currentIndex > 1 && onPrev()}
                />
                <Button
                    icon="i-lucide-chevron-down"
                    xs
                    slate
                    faded
                    disabled={isDownDisabled}
                    onClick={() => currentIndex < totalLength && onNext()}
                />
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-sm font-medium text-n-slate-12 tabular-nums">
                    {totalLength <= 1 ? '1' : currentIndex}
                </span>
                {totalLength > 1 ? <span className="text-sm text-n-slate-9 relative -top-px">/</span> : null}
                {totalLength > 1 ? <span className="text-sm text-n-slate-9 tabular-nums">{totalLength}</span> : null}
            </div>
        </div>
    );
}
