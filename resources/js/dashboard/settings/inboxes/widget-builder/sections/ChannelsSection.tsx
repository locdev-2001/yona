import type { Dispatch, SetStateAction } from 'react';

import { t } from '../../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import Input from 'dashboard/components-next/input/Input';
import SelectInput from 'dashboard/components-next/select/Select';
import Switch from 'dashboard/components-next/switch/Switch';
import { PLATFORM_LOGOS } from '../../../../../widget/ui/platformLogos';
import type { PlatformLogo } from '../../../../../widget/ui/platformLogos';
import SectionCard from '../components/SectionCard';
import type { WidgetBuilderFieldErrors, WidgetDraft } from '../types';
import type { WidgetOtherChannelKind } from '../../types';

const MAX_CHANNELS = 6;
const MAX_LINKS = 5;

const CHANNEL_KINDS: WidgetOtherChannelKind[] = [
    'zalo',
    'messenger',
    'telegram',
    'whatsapp',
    'instagram',
    'tiktok',
    'hotline',
    'email',
    'custom',
];

const VALUE_PLACEHOLDER: Record<WidgetOtherChannelKind, string> = {
    zalo: 'zalo.me/0901000000',
    messenger: 'm.me/tenshop',
    telegram: 't.me/tenshop',
    whatsapp: 'wa.me/84901000000',
    instagram: 'instagram.com/tenshop',
    tiktok: 'tiktok.com/@tenshop',
    hotline: '0901 234 567',
    email: 'ho-tro@shop.vn',
    custom: 'https://…',
};

function channelKindLabel(kind: WidgetOtherChannelKind): string {
    return kind === 'custom' || kind === 'hotline' || kind === 'email'
        ? t(`WIDGET_BUILDER.CHANNELS.KIND_${kind.toUpperCase()}`)
        : kind.charAt(0).toUpperCase() + kind.slice(1);
}

function ChannelIcon({ kind }: { kind: WidgetOtherChannelKind }) {
    if (kind in PLATFORM_LOGOS) {
        return (
            <span
                className="flex items-center justify-center size-5 shrink-0 [&>svg]:size-5"
                dangerouslySetInnerHTML={{ __html: PLATFORM_LOGOS[kind as PlatformLogo] }}
            />
        );
    }

    const icon = kind === 'hotline' ? 'i-lucide-phone' : kind === 'email' ? 'i-lucide-mail' : 'i-lucide-link';

    return <Icon icon={icon} className="size-5 shrink-0 text-n-slate-11" />;
}

interface ReorderButtonsProps {
    index: number;
    lastIndex: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

function ReorderButtons({ index, lastIndex, onMoveUp, onMoveDown }: ReorderButtonsProps) {
    return (
        <div className="flex flex-col shrink-0">
            <button
                type="button"
                aria-label={t('WIDGET_BUILDER.CHANNELS.MOVE_UP')}
                disabled={index === 0}
                className="text-n-slate-10 hover:text-n-slate-12 disabled:opacity-30 disabled:hover:text-n-slate-10"
                onClick={onMoveUp}
            >
                <Icon icon="i-lucide-chevron-up" className="size-4" />
            </button>
            <button
                type="button"
                aria-label={t('WIDGET_BUILDER.CHANNELS.MOVE_DOWN')}
                disabled={index === lastIndex}
                className="text-n-slate-10 hover:text-n-slate-12 disabled:opacity-30 disabled:hover:text-n-slate-10"
                onClick={onMoveDown}
            >
                <Icon icon="i-lucide-chevron-down" className="size-4" />
            </button>
        </div>
    );
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    return next;
}

interface ChannelsSectionProps {
    draft: WidgetDraft;
    setDraft: Dispatch<SetStateAction<WidgetDraft>>;
    errors: WidgetBuilderFieldErrors;
}

export default function ChannelsSection({ draft, setDraft, errors }: ChannelsSectionProps) {
    const channels = draft.widgetSettings.other_channels;
    const links = draft.widgetSettings.custom_links;

    const setChannels = (updater: (list: typeof channels) => typeof channels) =>
        setDraft(current => ({
            ...current,
            widgetSettings: { ...current.widgetSettings, other_channels: updater(current.widgetSettings.other_channels) },
        }));

    const setLinks = (updater: (list: typeof links) => typeof links) =>
        setDraft(current => ({
            ...current,
            widgetSettings: { ...current.widgetSettings, custom_links: updater(current.widgetSettings.custom_links) },
        }));

    const addChannel = () =>
        setChannels(list =>
            list.length >= MAX_CHANNELS ? list : [...list, { kind: 'zalo', label: null, value: '', enabled: true }],
        );

    const addLink = () => setLinks(list => (list.length >= MAX_LINKS ? list : [...list, { label: '', url: '' }]));

    return (
        <>
            <SectionCard id="channels" title={t('WIDGET_BUILDER.CHANNELS.TITLE')} description={t('WIDGET_BUILDER.CHANNELS.DESCRIPTION')}>
                {channels.map((channel, index) => (
                    // eslint-disable-next-line react/no-array-index-key -- danh sách không có id ổn định, chỉ có thứ tự.
                    <div key={index} className="flex items-center gap-3">
                        <ReorderButtons
                            index={index}
                            lastIndex={channels.length - 1}
                            onMoveUp={() => setChannels(list => moveItem(list, index, index - 1))}
                            onMoveDown={() => setChannels(list => moveItem(list, index, index + 1))}
                        />
                        <ChannelIcon kind={channel.kind} />
                        <SelectInput
                            className="w-36 shrink-0"
                            value={channel.kind}
                            options={CHANNEL_KINDS.map(kind => ({ value: kind, label: channelKindLabel(kind) }))}
                            onChange={kind =>
                                setChannels(list =>
                                    list.map((item, at) => (at === index ? { ...item, kind: kind as WidgetOtherChannelKind } : item)),
                                )
                            }
                        />
                        <div className="flex-1 min-w-0">
                            <Input
                                aria-label={t('WIDGET_BUILDER.CHANNELS.VALUE_LABEL')}
                                value={channel.value}
                                placeholder={VALUE_PLACEHOLDER[channel.kind]}
                                message={errors[`other_channels.${index}`] ?? ''}
                                messageType="error"
                                onChange={event =>
                                    setChannels(list => list.map((item, at) => (at === index ? { ...item, value: event.target.value } : item)))
                                }
                            />
                        </div>
                        <Switch
                            value={channel.enabled}
                            ariaLabel={t('WIDGET_BUILDER.CHANNELS.ENABLED_LABEL')}
                            onChange={enabled => setChannels(list => list.map((item, at) => (at === index ? { ...item, enabled } : item)))}
                        />
                        <button
                            type="button"
                            aria-label={t('WIDGET_BUILDER.CHANNELS.REMOVE')}
                            className="text-n-slate-10 hover:text-n-ruby-9 shrink-0"
                            onClick={() => setChannels(list => list.filter((_, at) => at !== index))}
                        >
                            <Icon icon="i-lucide-x" className="size-4" />
                        </button>
                    </div>
                ))}

                {channels.length < MAX_CHANNELS ? (
                    <Button variant="link" size="sm" icon="i-lucide-plus" label={t('WIDGET_BUILDER.CHANNELS.ADD')} onClick={addChannel} />
                ) : null}
            </SectionCard>

            <SectionCard
                title={t('WIDGET_BUILDER.CHANNELS.LINKS_TITLE')}
                description={t('WIDGET_BUILDER.CHANNELS.LINKS_DESCRIPTION', { max: MAX_LINKS })}
            >
                {links.map((link, index) => (
                    // eslint-disable-next-line react/no-array-index-key -- danh sách không có id ổn định, chỉ có thứ tự.
                    <div key={index} className="flex items-start gap-3">
                        <ReorderButtons
                            index={index}
                            lastIndex={links.length - 1}
                            onMoveUp={() => setLinks(list => moveItem(list, index, index - 1))}
                            onMoveDown={() => setLinks(list => moveItem(list, index, index + 1))}
                        />
                        <Input
                            label={t('WIDGET_BUILDER.CHANNELS.LINK_LABEL_LABEL')}
                            value={link.label}
                            className="flex-1"
                            onChange={event => setLinks(list => list.map((item, at) => (at === index ? { ...item, label: event.target.value } : item)))}
                        />
                        <Input
                            label={t('WIDGET_BUILDER.CHANNELS.LINK_URL_LABEL')}
                            value={link.url}
                            placeholder="https://…"
                            className="flex-1"
                            message={errors[`custom_links.${index}`] ?? ''}
                            messageType="error"
                            onChange={event => setLinks(list => list.map((item, at) => (at === index ? { ...item, url: event.target.value } : item)))}
                        />
                        <button
                            type="button"
                            aria-label={t('WIDGET_BUILDER.CHANNELS.REMOVE')}
                            className="text-n-slate-10 hover:text-n-ruby-9 shrink-0 mt-2.5"
                            onClick={() => setLinks(list => list.filter((_, at) => at !== index))}
                        >
                            <Icon icon="i-lucide-x" className="size-4" />
                        </button>
                    </div>
                ))}

                {links.length < MAX_LINKS ? (
                    <Button variant="link" size="sm" icon="i-lucide-plus" label={t('WIDGET_BUILDER.CHANNELS.ADD_LINK')} onClick={addLink} />
                ) : null}
            </SectionCard>
        </>
    );
}
