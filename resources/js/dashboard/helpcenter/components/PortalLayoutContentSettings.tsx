import { useEffect, useMemo, useRef, useState } from 'react';
import { BRAND_ICONS } from 'dashboard/icons';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import Icon from 'dashboard/components-next/icon/Icon';
import RadioCard from 'dashboard/components-next/radioCard/RadioCard';
import { useClickAway } from 'dashboard/composables/useClickAway';
import classicLayoutPreview from '../helper/classic-layout-preview.svg?raw';
import documentationLayoutPreview from '../helper/documentation-layout-preview.svg?raw';
import type { Portal } from '../types';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/PortalLayoutContentSettings.vue.
const PORTAL_LAYOUTS = { CLASSIC: 'classic', DOCUMENTATION: 'documentation' } as const;

// `prefix` là phần link help center tự điền; CSDL chỉ lưu phần định danh.
const SOCIAL_PLATFORMS = [
    { key: 'facebook', label: 'Facebook', icon: BRAND_ICONS.facebook, prefix: 'facebook.com/' },
    { key: 'x', label: 'X', icon: BRAND_ICONS.x, prefix: 'x.com/' },
    { key: 'instagram', label: 'Instagram', icon: BRAND_ICONS.instagram, prefix: 'instagram.com/' },
    { key: 'linkedin', label: 'LinkedIn', icon: BRAND_ICONS.linkedin, prefix: 'linkedin.com/' },
    { key: 'youtube', label: 'YouTube', icon: BRAND_ICONS.youtube, prefix: 'youtube.com/' },
    { key: 'tiktok', label: 'TikTok', icon: BRAND_ICONS.tiktok, prefix: 'tiktok.com/' },
    { key: 'github', label: 'GitHub', icon: BRAND_ICONS.github, prefix: 'github.com/' },
    { key: 'whatsapp', label: 'WhatsApp', icon: BRAND_ICONS.whatsapp, prefix: 'wa.me/' },
];

interface PortalLayoutContentSettingsProps {
    activePortal: Portal;
    isFetching?: boolean;
    onUpdatePortalConfiguration: (portal: Record<string, unknown>) => void;
}

export default function PortalLayoutContentSettings({
    activePortal,
    isFetching = false,
    onUpdatePortalConfiguration,
}: PortalLayoutContentSettingsProps) {
    const [layout, setLayout] = useState<string>(PORTAL_LAYOUTS.CLASSIC);
    const [socialProfiles, setSocialProfiles] = useState<Record<string, string>>({});
    const [visiblePlatforms, setVisiblePlatforms] = useState<string[]>([]);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [originalSnapshot, setOriginalSnapshot] = useState('');
    const addMenuRef = useRef<HTMLDivElement>(null);
    useClickAway(addMenuRef, () => setShowAddMenu(false), showAddMenu);

    const portalConfig = activePortal?.config;

    useEffect(() => {
        const savedProfiles = portalConfig?.social_profiles ?? {};
        const nextLayout = portalConfig?.layout || PORTAL_LAYOUTS.CLASSIC;
        const nextProfiles = SOCIAL_PLATFORMS.reduce<Record<string, string>>((accumulator, { key }) => {
            accumulator[key] = savedProfiles[key] || '';

            return accumulator;
        }, {});
        const nextVisible = SOCIAL_PLATFORMS.map(platform => platform.key).filter(key =>
            (savedProfiles[key] || '').trim(),
        );

        setLayout(nextLayout);
        setSocialProfiles(nextProfiles);
        setVisiblePlatforms(nextVisible);
        setOriginalSnapshot(
            JSON.stringify({
                layout: nextLayout,
                social: nextVisible.reduce<Record<string, string>>((accumulator, key) => {
                    const handle = (savedProfiles[key] || '').trim();
                    if (handle) accumulator[key] = handle;

                    return accumulator;
                }, {}),
            }),
        );
    }, [activePortal]);

    const buildSocialProfiles = () =>
        visiblePlatforms.reduce<Record<string, string>>((accumulator, key) => {
            const handle = (socialProfiles[key] || '').trim();
            if (handle) accumulator[key] = handle;

            return accumulator;
        }, {});

    const hasChanges = JSON.stringify({ layout, social: buildSocialProfiles() }) !== originalSnapshot;

    const visiblePlatformDetails = visiblePlatforms
        .map(key => SOCIAL_PLATFORMS.find(platform => platform.key === key))
        .filter(Boolean) as typeof SOCIAL_PLATFORMS;

    const addablePlatforms = useMemo(
        () =>
            SOCIAL_PLATFORMS.filter(platform => !visiblePlatforms.includes(platform.key)).map(platform => ({
                label: platform.label,
                value: platform.key,
                action: platform.key,
                icon: platform.icon,
            })),
        [visiblePlatforms],
    );

    return (
        <div className="flex flex-col w-full gap-6">
            <div className="flex flex-col gap-2">
                <h6 className="text-base font-medium text-n-slate-12">
                    {t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.HEADER')}
                </h6>
                <span className="text-sm text-n-slate-11">
                    {t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.DESCRIPTION')}
                </span>
            </div>

            <section className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-n-slate-11">
                    <RadioCard
                        id={PORTAL_LAYOUTS.CLASSIC}
                        isActive={layout === PORTAL_LAYOUTS.CLASSIC}
                        label={t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.LAYOUT.CLASSIC.TITLE')}
                        description={t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.LAYOUT.CLASSIC.DESCRIPTION')}
                        onSelect={value => setLayout(value)}
                    >
                        <div className="w-full mt-2 rounded-md overflow-hidden bg-n-slate-2">
                            <span dangerouslySetInnerHTML={{ __html: classicLayoutPreview }} />
                        </div>
                    </RadioCard>

                    <RadioCard
                        id={PORTAL_LAYOUTS.DOCUMENTATION}
                        isActive={layout === PORTAL_LAYOUTS.DOCUMENTATION}
                        label={t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.LAYOUT.SIDEBAR.TITLE')}
                        description={t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.LAYOUT.SIDEBAR.DESCRIPTION')}
                        onSelect={value => setLayout(value)}
                    >
                        <div className="w-full mt-2 rounded-md overflow-hidden bg-n-slate-2">
                            <span dangerouslySetInnerHTML={{ __html: documentationLayoutPreview }} />
                        </div>
                    </RadioCard>
                </div>
            </section>

            {layout === PORTAL_LAYOUTS.DOCUMENTATION ? (
                <section className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <h6 className="text-sm font-medium text-n-slate-12">
                            {t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.SOCIAL_LINKS.HEADER')}
                        </h6>
                        <span className="text-sm text-n-slate-11">
                            {t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.SOCIAL_LINKS.DESCRIPTION')}
                        </span>
                    </div>

                    {visiblePlatformDetails.map(platform => (
                        <div
                            key={platform.key}
                            className="field-surface flex items-center h-10 gap-1.5 px-3 rounded-lg"
                        >
                            <Icon icon={platform.icon} className="size-4 shrink-0 text-n-slate-11" />
                            <span className="text-sm shrink-0 text-n-slate-10">{platform.prefix}</span>
                            <input
                                value={socialProfiles[platform.key] ?? ''}
                                type="text"
                                className="flex-1 min-w-0 text-sm bg-transparent outline-none reset-base text-n-slate-12 placeholder:text-n-slate-10"
                                placeholder={t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.SOCIAL_LINKS.PLACEHOLDER')}
                                onChange={event =>
                                    setSocialProfiles(current => ({ ...current, [platform.key]: event.target.value }))
                                }
                            />
                            <Button
                                icon="i-lucide-x"
                                color="slate"
                                variant="ghost"
                                size="xs"
                                aria-label={t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.SOCIAL_LINKS.REMOVE')}
                                onClick={() => {
                                    setVisiblePlatforms(current => current.filter(key => key !== platform.key));
                                    setSocialProfiles(current => ({ ...current, [platform.key]: '' }));
                                }}
                            />
                        </div>
                    ))}

                    {addablePlatforms.length ? (
                        <div ref={addMenuRef} className="relative">
                            <Button
                                label={t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.SOCIAL_LINKS.ADD')}
                                icon="i-lucide-plus"
                                color="slate"
                                variant="faded"
                                size="sm"
                                onClick={() => setShowAddMenu(open => !open)}
                            />
                            {showAddMenu ? (
                                <DropdownMenu
                                    menuItems={addablePlatforms}
                                    className="mt-1 w-52 top-full ltr:left-0 rtl:right-0"
                                    onAction={item => {
                                        const key = String(item.value);
                                        setVisiblePlatforms(current =>
                                            current.includes(key) ? current : [...current, key],
                                        );
                                        setShowAddMenu(false);
                                    }}
                                />
                            ) : null}
                        </div>
                    ) : null}
                </section>
            ) : null}

            <div className="flex justify-end">
                <Button
                    label={t('HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.SAVE')}
                    disabled={!hasChanges || isFetching}
                    onClick={() =>
                        onUpdatePortalConfiguration({
                            id: activePortal.id,
                            slug: activePortal.slug,
                            config: { layout, social_profiles: buildSocialProfiles() },
                        })
                    }
                />
            </div>
        </div>
    );
}
