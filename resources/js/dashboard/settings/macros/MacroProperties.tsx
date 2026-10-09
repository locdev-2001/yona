import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import WootInput from 'dashboard/components/widgets/forms/Input';
import { t } from '../../../i18n';
import type { MacroVisibility } from './types';

// Port từ settings/macros/MacroProperties.vue. Ô tên là legacy `woot-input`
// (style đến từ global _base.scss) như gốc. Gốc có hai rule scoped `:deep`;
// chỉ rule `.error .message { mb-0 }` thực sự thắng _base.scss nên chỉ giữ nó —
// rule `input[type=text] { mb-0 }` thua selector `input[type]:not(...)` của
// _base.scss (độ đặc hiệu cao hơn) nên ô tên vẫn giữ mb-4 như oracle.
interface Props {
    macroName: string;
    macroVisibility: MacroVisibility;
    nameError?: boolean;
    canManagePublicMacros?: boolean;
    readOnly?: boolean;
    onNameChange: (value: string) => void;
    onVisibilityChange: (value: MacroVisibility) => void;
    onSubmit: () => void;
}

const ACTIVE_CLASS = 'bg-n-blue-2 border-n-blue-3';
const INACTIVE_CLASS = 'bg-n-surface-panel border-n-weak';
const CARD_CLASS = 'p-2 relative rounded-md border border-solid justify-between items-start gap-2 flex flex-col text-start';

export default function MacroProperties({
    macroName,
    macroVisibility,
    nameError = false,
    canManagePublicMacros = true,
    readOnly = false,
    onNameChange,
    onVisibilityChange,
    onSubmit,
}: Props) {
    const isPublicVisibilityDisabled = !canManagePublicMacros;

    const publicVisibilityDescription = readOnly
        ? t('MACROS.EDITOR.VISIBILITY.GLOBAL.EDIT_DISABLED_DESCRIPTION')
        : isPublicVisibilityDisabled
          ? t('MACROS.EDITOR.VISIBILITY.GLOBAL.CREATE_DISABLED_DESCRIPTION')
          : t('MACROS.EDITOR.VISIBILITY.GLOBAL.DESCRIPTION');

    const isActive = (key: MacroVisibility) => (macroVisibility === key ? ACTIVE_CLASS : INACTIVE_CLASS);

    const updateName = (value: string) => {
        if (readOnly) return;
        onNameChange(value);
    };

    const updateVisibility = (value: MacroVisibility) => {
        if (readOnly) return;
        if (value === 'global' && isPublicVisibilityDisabled) return;
        onVisibilityChange(value);
    };

    return (
        <div className="panel-surface p-4 rounded-xl h-full flex flex-col">
            <div>
                <WootInput
                    value={macroName}
                    label={t('MACROS.ADD.FORM.NAME.LABEL')}
                    placeholder={t('MACROS.ADD.FORM.NAME.PLACEHOLDER')}
                    error={nameError ? t('MACROS.ADD.FORM.NAME.ERROR') : ''}
                    readonly={readOnly}
                    className={`[&_.message]:!mb-0 ${nameError ? 'error' : ''}`}
                    onChange={updateName}
                />
            </div>
            <div className="mt-2">
                <p className="block m-0 text-sm font-medium leading-[1.8] text-n-slate-12">
                    {t('MACROS.EDITOR.VISIBILITY.LABEL')}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <button
                        type="button"
                        className={`${CARD_CLASS} ${isActive('global')}`}
                        disabled={isPublicVisibilityDisabled || readOnly}
                        aria-describedby={isPublicVisibilityDisabled ? 'macro-public-visibility-help' : undefined}
                        onClick={() => updateVisibility('global')}
                    >
                        <div className="flex items-center gap-2 min-w-0 justify-between w-full">
                            <p className="block m-0 text-heading-3 text-n-slate-12 line-clamp-1">
                                {t('MACROS.EDITOR.VISIBILITY.GLOBAL.LABEL')}
                            </p>
                            {macroVisibility === 'global' ? (
                                <Icon icon="i-lucide-circle-check-big" className="text-n-brand size-4" />
                            ) : null}
                        </div>
                        <p id="macro-public-visibility-help" className="text-n-slate-11 text-label-small">
                            {publicVisibilityDescription}
                        </p>
                    </button>
                    <button
                        type="button"
                        className={`${CARD_CLASS} ${isActive('personal')}`}
                        disabled={readOnly}
                        onClick={() => updateVisibility('personal')}
                    >
                        <div className="flex items-center gap-2 min-w-0 justify-between w-full">
                            <p className="block m-0 text-heading-3 text-n-slate-12 line-clamp-1">
                                {t('MACROS.EDITOR.VISIBILITY.PERSONAL.LABEL')}
                            </p>
                            {macroVisibility === 'personal' ? (
                                <Icon icon="i-lucide-circle-check-big" className="text-n-brand size-4" />
                            ) : null}
                        </div>
                        <p className="text-n-slate-11 text-label-small">
                            {t('MACROS.EDITOR.VISIBILITY.PERSONAL.DESCRIPTION')}
                        </p>
                    </button>
                </div>
                <div className="mt-2 flex items-start p-2 bg-n-alpha-1 gap-2 rounded-md">
                    <Icon icon="i-lucide-info" className="flex-shrink-0 mt-0.5 size-4 text-n-slate-11" />
                    <p className="mb-0 text-n-slate-11 text-body-para">{t('MACROS.ORDER_INFO')}</p>
                </div>
            </div>
            <div className="mt-4 w-full">
                <Button
                    blue
                    solid
                    label={t('MACROS.HEADER_BTN_TXT_SAVE')}
                    className="w-full"
                    disabled={readOnly}
                    onClick={onSubmit}
                />
            </div>
        </div>
    );
}
