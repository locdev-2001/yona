import type { Dispatch, SetStateAction } from 'react';

import { t } from '../../../../../i18n';
import SectionCard from '../components/SectionCard';
import ToggleRow from '../components/ToggleRow';
import type { WidgetDraft } from '../types';

interface CaptureSectionProps {
    draft: WidgetDraft;
    setDraft: Dispatch<SetStateAction<WidgetDraft>>;
}

export default function CaptureSection({ draft, setDraft }: CaptureSectionProps) {
    const { capture } = draft.widgetSettings;

    const setCapture = (key: keyof typeof capture, value: boolean) =>
        setDraft(current => ({
            ...current,
            widgetSettings: { ...current.widgetSettings, capture: { ...current.widgetSettings.capture, [key]: value } },
        }));

    return (
        <SectionCard id="capture" title={t('WIDGET_BUILDER.CAPTURE.TITLE')} description={t('WIDGET_BUILDER.CAPTURE.DESCRIPTION')}>
            <ToggleRow
                isFirst
                label={t('WIDGET_BUILDER.CAPTURE.PHONE_LABEL')}
                value={capture.phone}
                onChange={value => setCapture('phone', value)}
            />
            <ToggleRow label={t('WIDGET_BUILDER.CAPTURE.EMAIL_LABEL')} value={capture.email} onChange={value => setCapture('email', value)} />
        </SectionCard>
    );
}
