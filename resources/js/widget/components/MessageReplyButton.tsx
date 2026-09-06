import FluentIcon from 'shared/components/FluentIcon/FluentIcon';

// Port từ widget/components/MessageReplyButton.vue
export default function MessageReplyButton({ className = '', onClick }: { className?: string; onClick: () => void }) {
    return (
        <button
            type="button"
            className={`p-1 mb-1 rounded-full text-n-slate-11 bg-n-slate-3 hover:text-n-slate-12 ${className}`.trim()}
            onClick={onClick}
        >
            <FluentIcon icon="arrow-reply" size="11" className="flex-shrink-0" />
        </button>
    );
}
