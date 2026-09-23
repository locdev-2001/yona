import { Link, usePage } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { INBOX_TYPES, getInboxIconByType } from 'dashboard/helper/inbox';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';

// Port từ widgets/conversation/OnboardingView.vue + OnboardingFeatureCard.vue.
// Ảnh minh hoạ của gốc (logo WhatsApp/Messenger/Gmail, ảnh chân dung người thật)
// thay bằng icon: thẻ kênh vẽ đúng các kênh Yona kết nối được ngay.
interface FeatureCard {
    i18nKey: string;
    path: string;
    illustrationIcons: string[];
}

const FEATURE_CARDS: FeatureCard[] = [
    {
        i18nKey: 'ONBOARDING.ALL_CONVERSATION',
        path: 'settings/inboxes/new',
        illustrationIcons: [INBOX_TYPES.ZALO, INBOX_TYPES.WEB, INBOX_TYPES.EMAIL].map(type => getInboxIconByType(type)),
    },
    // Gốc trỏ settings_teams_new (tạo nhóm) dù chữ trên thẻ là mời đồng đội qua email.
    { i18nKey: 'ONBOARDING.TEAM_MEMBERS', path: 'settings/agents/list', illustrationIcons: ['i-lucide-users'] },
    {
        i18nKey: 'ONBOARDING.CANNED_RESPONSES',
        path: 'settings/canned-response/list',
        illustrationIcons: ['i-lucide-message-square-quote'],
    },
    { i18nKey: 'ONBOARDING.LABELS', path: 'settings/labels/list', illustrationIcons: ['i-lucide-tags'] },
];

function greetingKey(hours: number): string {
    if (hours < 12) return 'ONBOARDING.GREETING_MORNING';
    if (hours < 18) return 'ONBOARDING.GREETING_AFTERNOON';
    return 'ONBOARDING.GREETING_EVENING';
}

function OnboardingFeatureCard({ card, accountId }: { card: FeatureCard; accountId: number }) {
    return (
        <div className="h-full w-full bg-n-surface-2 border border-n-weak rounded-lg p-4 flex flex-col">
            <div className="flex-1 min-h-36 flex items-center justify-center gap-3" aria-hidden="true">
                {card.illustrationIcons.map(icon => (
                    <span
                        key={icon}
                        className="flex items-center justify-center size-14 rounded-2xl bg-n-solid-1 border border-n-weak shadow-sm"
                    >
                        <Icon icon={icon} className="size-7 text-n-slate-12" />
                    </span>
                ))}
            </div>
            <div className="mt-auto">
                <p className="text-base text-n-slate-12 font-interDisplay font-semibold tracking-[0.3px]">
                    {t(`${card.i18nKey}.TITLE`)}
                </p>
                <p className="text-n-slate-11 text-sm">{t(`${card.i18nKey}.DESCRIPTION`)}</p>
                <Link
                    href={accountScopedUrl(accountId, card.path)}
                    className="no-underline text-n-brand text-sm font-medium"
                >
                    <span>{t(`${card.i18nKey}.NEW_LINK`)}</span>
                    <span className="ms-2">→</span>
                </Link>
            </div>
        </div>
    );
}

export default function OnboardingView() {
    const { auth, globalConfig, currentAccount } = usePage<DashboardPageProps>().props;
    const installationName = globalConfig.installationName;

    return (
        <div className="min-h-full lg:max-w-5xl max-w-4xl mx-auto grid grid-cols-1 auto-rows-min xl:grid-cols-2 xl:grid-rows-[auto_1fr_1fr] xl:min-h-screen gap-4 p-8 w-full font-inter overflow-auto">
            <div className="col-span-full self-start">
                <p className="text-xl font-semibold text-n-slate-12 font-interDisplay tracking-[0.3px]">
                    {t(greetingKey(new Date().getHours()), { name: auth.user?.name ?? '', installationName })}
                </p>
                <p className="text-n-slate-11 max-w-2xl text-base">{t('ONBOARDING.DESCRIPTION', { installationName })}</p>
            </div>
            {FEATURE_CARDS.map(card => (
                <OnboardingFeatureCard key={card.i18nKey} card={card} accountId={currentAccount.id} />
            ))}
        </div>
    );
}
