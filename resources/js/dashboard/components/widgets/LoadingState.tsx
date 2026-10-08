import Loader from 'shared/components/loader/Loader';

// Port từ dashboard/components/widgets/LoadingState.vue
export default function LoadingState({ message = '', className = '' }: { message?: string; className?: string }) {
    return (
        <div className={`flex items-center justify-center p-8 ${className}`.trimEnd()}>
            <h6 className="flex items-center gap-3 text-base text-center w-100 text-n-slate-11">
                <span className="text-body-main !text-base text-n-slate-12">{message}</span>
                <Loader className="text-n-brand" />
            </h6>
        </div>
    );
}
