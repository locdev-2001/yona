import type { Dispatch, SetStateAction } from 'react';
import { Link } from '@inertiajs/react';

import { t } from '../../../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import SectionCard from '../components/SectionCard';
import ToggleRow from '../components/ToggleRow';
import type { WidgetDraft } from '../types';

interface HomeSectionProps {
    accountId: number;
    draft: WidgetDraft;
    setDraft: Dispatch<SetStateAction<WidgetDraft>>;
    helpCenter: { name: string; article_count: number } | null;
}

export default function HomeSection({ accountId, draft, setDraft, helpCenter }: HomeSectionProps) {
    const { blocks } = draft.widgetSettings.home;

    const setBlock = (key: keyof typeof blocks, value: boolean) =>
        setDraft(current => ({
            ...current,
            widgetSettings: {
                ...current.widgetSettings,
                home: { blocks: { ...current.widgetSettings.home.blocks, [key]: value } },
            },
        }));

    const helpDescription = helpCenter
        ? t('WIDGET_BUILDER.HOME.HELP_BLOCK_CONNECTED', { portal: helpCenter.name, count: helpCenter.article_count })
        : undefined;

    return (
        <SectionCard id="home" title={t('WIDGET_BUILDER.HOME.TITLE')} description={t('WIDGET_BUILDER.HOME.DESCRIPTION')}>
            <ToggleRow
                isFirst
                label={t('WIDGET_BUILDER.HOME.BLOCK_MESSAGE_SHOP')}
                description={t('WIDGET_BUILDER.HOME.BLOCK_MESSAGE_SHOP_DESCRIPTION')}
                lockedLabel={t('WIDGET_BUILDER.HOME.ALWAYS_ON')}
            />

            <ToggleRow
                label={t('WIDGET_BUILDER.HOME.BLOCK_RECENT_CONVERSATION')}
                value={blocks.recent_conversation}
                onChange={value => setBlock('recent_conversation', value)}
            />

            <ToggleRow
                label={t('WIDGET_BUILDER.HOME.BLOCK_HELP')}
                description={helpDescription}
                value={blocks.help}
                onChange={value => setBlock('help', value)}
                extra={
                    !helpCenter ? (
                        <Link href={accountScopedUrl(accountId, 'portals/new')} className="text-label-small text-n-blue-11 hover:underline">
                            {t('WIDGET_BUILDER.HOME.HELP_BLOCK_NOT_CONNECTED')}
                        </Link>
                    ) : undefined
                }
            />

            <ToggleRow
                label={t('WIDGET_BUILDER.HOME.BLOCK_OTHER_CHANNELS')}
                value={blocks.other_channels}
                onChange={value => setBlock('other_channels', value)}
            />

            <ToggleRow
                label={t('WIDGET_BUILDER.HOME.BLOCK_CUSTOM_LINKS')}
                value={blocks.custom_links}
                onChange={value => setBlock('custom_links', value)}
            />

            <ToggleRow
                label={t('WIDGET_BUILDER.HOME.BLOCK_REQUEST')}
                description={t('WIDGET_BUILDER.HOME.BLOCK_REQUEST_DESCRIPTION')}
                badge={t('WIDGET_BUILDER.COMING_SOON')}
            />
        </SectionCard>
    );
}
