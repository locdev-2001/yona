import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';

// Port từ dashboard/components/widgets/InboxName.vue
interface InboxNameProps {
    inbox: { name: string; channel_type: string };
    className?: string;
}

export default function InboxName({ inbox, className = '' }: InboxNameProps) {
    return (
        <div title={inbox.name} className={`flex items-center gap-0.5 min-w-0 ${className}`.trim()}>
            <ChannelIcon inbox={inbox} className="size-4 flex-shrink-0 text-n-slate-11" />
            <span className="truncate text-label-small text-n-slate-11">{inbox.name}</span>
        </div>
    );
}
