import Button from 'dashboard/components-next/button/Button';
import NextInput from 'dashboard/components-next/input/Input';
import MultiSelect from 'dashboard/components-next/filter/inputs/MultiSelect';
import SingleSelect from 'dashboard/components-next/filter/inputs/SingleSelect';
import type { FilterOption } from 'dashboard/components-next/filter/helper/filterHelper';
import WootMessageEditor from 'dashboard/components/widgets/WootWriter/Editor';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { t } from '../../../i18n';
import type { AutomationAction } from 'dashboard/settings/automation/types';
import type { AutomationActionDefinition } from 'dashboard/settings/automation/constants';

// Port từ dashboard/components/widgets/AutomationActionInput.vue — một hàng
// action dùng chung cho Automation và Macros (D3). Bỏ: email, attachment
// (action chưa có driver bị ẩn khỏi actionTypes nên không tới đây).
interface ActionTypeOption extends AutomationActionDefinition {
    labelText: string;
    icon: string;
}

interface Props {
    action: AutomationAction;
    actionTypes: ActionTypeOption[];
    dropdownValues: FilterOption[];
    showActionInput?: boolean;
    errorMessage?: string;
    isMacro?: boolean;
    dropdownMaxHeight?: string;
    uiSettings: UISettings;
    editorId: string;
    onChange: (action: AutomationAction) => void;
    onResetAction: () => void;
    onRemoveAction: () => void;
}

const isOption = (value: unknown): value is FilterOption =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value) && 'id' in (value as object);

const asOptionArray = (value: unknown): FilterOption[] => (Array.isArray(value) ? value.filter(isOption) : []);

// Port từ AutomationActionTeamMessageInput.vue — đội nhận thư + lời nhắn kèm.
interface TeamMessageValue {
    team_ids: FilterOption[];
    message: string;
}

const asTeamMessage = (value: unknown): TeamMessageValue => {
    const payload = (Array.isArray(value) ? value[0] : value) as Partial<TeamMessageValue> | null | undefined;
    return {
        team_ids: asOptionArray(payload?.team_ids),
        message: typeof payload?.message === 'string' ? payload.message : '',
    };
};

function TeamMessageInput({
    value,
    teams,
    dropdownMaxHeight,
    onChange,
}: {
    value: unknown;
    teams: FilterOption[];
    dropdownMaxHeight: string;
    onChange: (value: TeamMessageValue) => void;
}) {
    const current = asTeamMessage(value);

    return (
        <div className="flex flex-col gap-2">
            <MultiSelect
                value={current.team_ids}
                options={teams}
                dropdownMaxHeight={dropdownMaxHeight}
                onChange={selected => onChange({ ...current, team_ids: selected })}
            />
            <textarea
                className="mb-0 !text-sm"
                rows={4}
                value={current.message}
                placeholder={t('AUTOMATION.ACTION.TEAM_MESSAGE_INPUT_PLACEHOLDER')}
                onChange={event => onChange({ ...current, message: event.target.value })}
            />
        </div>
    );
}

export default function AutomationActionInput({
    action,
    actionTypes,
    dropdownValues,
    showActionInput = true,
    errorMessage = '',
    isMacro = false,
    dropdownMaxHeight = 'max-h-80',
    uiSettings,
    editorId,
    onChange,
    onResetAction,
    onRemoveAction,
}: Props) {
    const currentType = actionTypes.find(item => item.key === action.action_name);
    const inputType = currentType?.inputType ?? null;
    const isVerticalLayout = ['team_message', 'textarea', 'email'].includes(inputType ?? '');

    const actionTypeOptions: FilterOption[] = actionTypes.map(item => ({ id: item.key, name: item.labelText, icon: item.icon }));
    const selectedType = currentType ? { id: currentType.key, name: currentType.labelText } : null;

    const messageValue = Array.isArray(action.action_params)
        ? String(action.action_params[0] ?? '')
        : typeof action.action_params === 'string' ? action.action_params : '';

    // Đổi loại action luôn kèm xoá tham số cũ trong CÙNG một lần cập nhật: cha có
    // thể là component controlled (MacroForm) — hai lần gọi liên tiếp đều tính từ
    // prop cũ nên lần sau sẽ ghi đè lần trước, làm mất action_name vừa chọn.
    const onActionNameChange = (value: FilterOption | null) => {
        if (!value || String(value.id) === action.action_name) return;
        onChange({ ...action, action_name: String(value.id), action_params: [] });
        onResetAction();
    };

    const renderInlineInput = () => {
        if (!showActionInput || isVerticalLayout) return null;
        if (inputType === 'search_select') {
            return (
                <SingleSelect
                    value={asOptionArray(action.action_params)[0] ?? (isOption(action.action_params) ? action.action_params : null)}
                    options={dropdownValues}
                    dropdownMaxHeight={dropdownMaxHeight}
                    onChange={value => onChange({ ...action, action_params: value ? [value] : [] })}
                />
            );
        }
        if (inputType === 'multi_select') {
            return (
                <MultiSelect
                    value={asOptionArray(action.action_params)}
                    options={dropdownValues}
                    dropdownMaxHeight={dropdownMaxHeight}
                    onChange={values => onChange({ ...action, action_params: values })}
                />
            );
        }
        if (inputType === 'url') {
            return (
                <NextInput
                    type="url"
                    size="sm"
                    value={messageValue}
                    placeholder={t('AUTOMATION.ACTION.URL_INPUT_PLACEHOLDER')}
                    onChange={event => onChange({ ...action, action_params: event.target.value })}
                />
            );
        }
        return null;
    };

    return (
        <li className="list-none py-2 first:pt-0 last:pb-0">
            <div className={`flex flex-col gap-2 ${errorMessage ? 'animate-wiggle' : ''}`}>
                <div className="flex items-center gap-2">
                    <SingleSelect
                        value={selectedType}
                        options={actionTypeOptions}
                        dropdownMaxHeight={dropdownMaxHeight}
                        disableDeselect
                        onChange={onActionNameChange}
                    />
                    {renderInlineInput()}
                    {!isMacro ? (
                        <Button type="button" sm solid slate icon="i-lucide-trash" className="flex-shrink-0" onClick={onRemoveAction} />
                    ) : null}
                </div>
                {inputType === 'team_message' ? (
                    <TeamMessageInput
                        value={action.action_params}
                        teams={dropdownValues}
                        dropdownMaxHeight={dropdownMaxHeight}
                        onChange={value => onChange({ ...action, action_params: value })}
                    />
                ) : null}
                {inputType === 'textarea' ? (
                    <WootMessageEditor
                        value={messageValue}
                        editorId={editorId}
                        uiSettings={uiSettings}
                        placeholder={t('AUTOMATION.ACTION.TEAM_MESSAGE_INPUT_PLACEHOLDER')}
                        className="field-surface px-3 py-1 rounded-lg"
                        onChange={value => onChange({ ...action, action_params: value })}
                    />
                ) : null}
            </div>
            {errorMessage ? <span className="text-sm text-n-ruby-11">{errorMessage}</span> : null}
        </li>
    );
}
