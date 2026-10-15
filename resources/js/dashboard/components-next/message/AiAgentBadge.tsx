import { t } from '../../../i18n';

// Huy hiệu "AI" cạnh tên nhân viên AI. Chỉ có ở dashboard: widget của khách không
// dùng component này nên khách không thấy.
export default function AiAgentBadge({ className = '' }: { className?: string }) {
    return (
        <span
            data-testid="ai-agent-badge"
            title={t('CONVERSATION.AUTO_RESPONDER.AI_BADGE_TITLE')}
            className={`inline-flex flex-shrink-0 items-center rounded bg-n-violet-3 px-1.5 py-0.5 text-xs font-medium leading-tight text-n-violet-11 ${className}`.trim()}
        >
            {t('CONVERSATION.AUTO_RESPONDER.AI_BADGE')}
        </span>
    );
}
