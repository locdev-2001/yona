import type { Dispatch, SetStateAction } from 'react';

import { t } from '../../../../../i18n';
import Input from 'dashboard/components-next/input/Input';
import Segmented from 'dashboard/components-next/segmented/Segmented';
import AccentColorField from '../components/AccentColorField';
import FieldRow from '../components/FieldRow';
import SectionCard from '../components/SectionCard';
import type { WidgetDraft } from '../types';

const GREETING_MAX_LENGTH = 80;
const LAUNCHER_LABEL_MAX_LENGTH = 30;

interface AppearanceSectionProps {
    draft: WidgetDraft;
    setDraft: Dispatch<SetStateAction<WidgetDraft>>;
}

export default function AppearanceSection({ draft, setDraft }: AppearanceSectionProps) {
    const { appearance } = draft.widgetSettings;

    const setAppearance = (patch: Partial<WidgetDraft['widgetSettings']['appearance']>) =>
        setDraft(current => ({
            ...current,
            widgetSettings: { ...current.widgetSettings, appearance: { ...current.widgetSettings.appearance, ...patch } },
        }));

    return (
        <SectionCard id="appearance" title={t('WIDGET_BUILDER.APPEARANCE.TITLE')} description={t('WIDGET_BUILDER.APPEARANCE.DESCRIPTION')}>
            <FieldRow label={t('WIDGET_BUILDER.APPEARANCE.ACCENT_COLOR_LABEL')}>
                <AccentColorField value={draft.widgetColor} onChange={widgetColor => setDraft(current => ({ ...current, widgetColor }))} />
            </FieldRow>

            <FieldRow label={t('WIDGET_BUILDER.APPEARANCE.LAUNCHER_LABEL')}>
                <Segmented
                    ariaLabel={t('WIDGET_BUILDER.APPEARANCE.LAUNCHER_LABEL')}
                    value={appearance.launcher}
                    options={[
                        { value: 'round', label: t('WIDGET_BUILDER.APPEARANCE.LAUNCHER_ROUND') },
                        { value: 'pill', label: t('WIDGET_BUILDER.APPEARANCE.LAUNCHER_PILL') },
                    ]}
                    onChange={launcher => setAppearance({ launcher: launcher as 'round' | 'pill' })}
                />
                {appearance.launcher === 'pill' ? (
                    <Input
                        className="mt-2"
                        value={appearance.launcher_label ?? ''}
                        maxLength={LAUNCHER_LABEL_MAX_LENGTH}
                        placeholder={t('WIDGET_BUILDER.APPEARANCE.LAUNCHER_LABEL_PLACEHOLDER')}
                        onChange={event => setAppearance({ launcher_label: event.target.value })}
                    />
                ) : null}
            </FieldRow>

            <FieldRow label={t('WIDGET_BUILDER.APPEARANCE.POSITION_LABEL')}>
                <Segmented
                    ariaLabel={t('WIDGET_BUILDER.APPEARANCE.POSITION_LABEL')}
                    value={appearance.position}
                    options={[
                        { value: 'left', label: t('WIDGET_BUILDER.APPEARANCE.POSITION_LEFT') },
                        { value: 'right', label: t('WIDGET_BUILDER.APPEARANCE.POSITION_RIGHT') },
                    ]}
                    onChange={position => setAppearance({ position: position as 'left' | 'right' })}
                />
            </FieldRow>

            <FieldRow label={t('WIDGET_BUILDER.APPEARANCE.GREETING_LABEL')} hint={t('WIDGET_BUILDER.APPEARANCE.GREETING_HINT')}>
                <Input
                    value={appearance.greeting ?? ''}
                    maxLength={GREETING_MAX_LENGTH}
                    placeholder={t('WIDGET_BUILDER.APPEARANCE.GREETING_PLACEHOLDER')}
                    onChange={event => setAppearance({ greeting: event.target.value })}
                />
            </FieldRow>
        </SectionCard>
    );
}
