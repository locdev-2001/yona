import Icon from 'dashboard/components-next/icon/Icon';
import Label from 'dashboard/components-next/label/Label';
import { t } from '../../../i18n';

// Port từ dashboard/components-next/CustomAttributes/AttributeBadge.vue
export type AttributeBadgeType = 'pre-chat' | 'resolution';

const BADGE_CONFIG: Record<AttributeBadgeType, { icon: string; labelKey: string }> = {
    'pre-chat': { icon: 'i-lucide-message-circle', labelKey: 'ATTRIBUTES_MGMT.BADGES.PRE_CHAT' },
    resolution: { icon: 'i-lucide-circle-check-big', labelKey: 'ATTRIBUTES_MGMT.BADGES.RESOLUTION' },
};

export default function AttributeBadge({ type = 'resolution' }: { type?: AttributeBadgeType }) {
    const config = BADGE_CONFIG[type] || BADGE_CONFIG.resolution;

    return (
        <Label
            label={t(config.labelKey)}
            color="slate"
            compact
            icon={<Icon icon={config.icon} className="size-3.5 text-n-slate-12" />}
        />
    );
}
