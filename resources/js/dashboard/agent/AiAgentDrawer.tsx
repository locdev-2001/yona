import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import { t } from '../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import SidePanel from 'dashboard/components-next/side-panel/SidePanel';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import ConfirmDialog from './ConfirmDialog';
import { assignmentConfirmation } from './channelAssignment';
import type { AssignmentConfirmation } from './channelAssignment';
import {
    CUSTOM_PERSONA,
    PERSONA_PRESET_KEYS,
    matchPersonaPreset,
    personaPresetLabel,
    personaPresetText,
} from './personaPresets';
import type { PersonaChoice } from './personaPresets';
import type { AiAgent, AiAgentFormValues, AiAgentInbox } from './types';

const AVATAR_ACCEPT = 'image/png, image/jpeg, image/jpg, image/gif, image/webp';

const FIELD_CLASS =
    'field-surface block w-full rounded-lg border-0 px-3 py-2 text-sm text-n-slate-12 placeholder:text-n-slate-10 !mb-0';

interface AiAgentDrawerProps {
    open: boolean;
    // null = tạo mới.
    aiAgent: AiAgent | null;
    aiAgents: AiAgent[];
    inboxes: AiAgentInbox[];
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (values: AiAgentFormValues, avatarFile: File | null) => void;
    onDelete: (aiAgent: AiAgent) => void;
}

const initialValues = (aiAgent: AiAgent | null): AiAgentFormValues =>
    aiAgent
        ? {
              name: aiAgent.name,
              persona: aiAgent.persona ?? '',
              instructions: aiAgent.instructions ?? '',
              inbox_ids: aiAgent.inbox_ids,
          }
        : { name: '', persona: personaPresetText('FRIENDLY'), instructions: '', inbox_ids: [] };

// Ngăn kéo bên phải để tạo hoặc sửa một nhân viên AI.
export default function AiAgentDrawer({
    open,
    aiAgent,
    aiAgents,
    inboxes,
    isSaving,
    onClose,
    onSubmit,
    onDelete,
}: AiAgentDrawerProps) {
    const [values, setValues] = useState<AiAgentFormValues>(() => initialValues(aiAgent));
    const [personaChoice, setPersonaChoice] = useState<PersonaChoice>(() => matchPersonaPreset(initialValues(aiAgent).persona));
    const [avatar, setAvatar] = useState<{ file: File; url: string } | null>(null);
    const [showNameError, setShowNameError] = useState(false);
    const [takeover, setTakeover] = useState<AssignmentConfirmation>({ kind: 'none' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const nameId = useId();
    const personaId = useId();
    const instructionsId = useId();

    useEffect(() => {
        if (!open) return;
        const next = initialValues(aiAgent);
        setValues(next);
        setPersonaChoice(matchPersonaPreset(next.persona));
        setAvatar(null);
        setShowNameError(false);
        setTakeover({ kind: 'none' });
    }, [open, aiAgent]);

    useEffect(() => () => {
        if (avatar) URL.revokeObjectURL(avatar.url);
    }, [avatar]);

    const isEditing = aiAgent !== null;
    const displayName = values.name.trim();
    const isNameMissing = displayName === '';

    const update = (patch: Partial<AiAgentFormValues>) => setValues(current => ({ ...current, ...patch }));

    const choosePreset = (choice: PersonaChoice) => {
        setPersonaChoice(choice);
        if (choice !== CUSTOM_PERSONA) update({ persona: personaPresetText(choice) });
    };

    const toggleInbox = (inbox: AiAgentInbox) => {
        if (values.inbox_ids.includes(inbox.id)) {
            update({ inbox_ids: values.inbox_ids.filter(id => id !== inbox.id) });
            return;
        }
        const confirmation = assignmentConfirmation(inbox, aiAgent?.id ?? -1, aiAgents, { requireOnTakeover: true });
        if (confirmation.kind === 'replace') {
            setTakeover(confirmation);
            return;
        }
        update({ inbox_ids: [...values.inbox_ids, inbox.id] });
    };

    const confirmTakeover = () => {
        if (takeover.kind !== 'replace') return;
        update({ inbox_ids: [...values.inbox_ids, takeover.inbox.id] });
        setTakeover({ kind: 'none' });
    };

    const pickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) setAvatar({ file, url: URL.createObjectURL(file) });
    };

    const submit = () => {
        if (isNameMissing) {
            setShowNameError(true);
            return;
        }
        onSubmit(values, avatar?.file ?? null);
    };

    const newAgentName = displayName || t('AI_AGENTS.REPLACE.NEW_AGENT');

    const footer = (
        <div className="flex items-center justify-between gap-2">
            {isEditing ? (
                <Button
                    link
                    ruby
                    type="button"
                    label={t('AI_AGENTS.FORM.DELETE')}
                    onClick={() => onDelete(aiAgent)}
                />
            ) : (
                <span />
            )}
            <div className="flex gap-2">
                <Button faded slate type="button" label={t('AI_AGENTS.FORM.CANCEL')} onClick={onClose} />
                <Button
                    type="button"
                    label={isEditing ? t('AI_AGENTS.FORM.SAVE') : t('AI_AGENTS.FORM.CREATE')}
                    isLoading={isSaving}
                    disabled={isSaving}
                    onClick={submit}
                />
            </div>
        </div>
    );

    return (
        <>
            <SidePanel
                open={open}
                width="xl"
                title={isEditing ? t('AI_AGENTS.FORM.EDIT_TITLE') : t('AI_AGENTS.FORM.CREATE_TITLE')}
                closeOnClickOutside={!isSaving}
                footer={footer}
                onClose={onClose}
            >
                <div className="flex flex-col gap-6" data-testid="ai-agent-form">
                    <div className="flex items-end gap-3.5">
                        <button
                            type="button"
                            aria-label={t('AI_AGENTS.FORM.AVATAR')}
                            className="flex-shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-n-brand active:scale-[0.97]"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Avatar
                                name={displayName}
                                src={avatar?.url ?? aiAgent?.avatar_url ?? ''}
                                seed={avatarSeed('ai_agent', aiAgent?.id ?? displayName)}
                                size={56}
                                roundedFull
                            />
                        </button>
                        <input ref={fileInputRef} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={pickAvatar} />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <label htmlFor={nameId} className="text-sm font-medium text-n-slate-12">
                                {t('AI_AGENTS.FORM.NAME')}
                            </label>
                            <input
                                id={nameId}
                                className={`${FIELD_CLASS} h-10 ${showNameError && isNameMissing ? 'field-invalid' : ''}`}
                                value={values.name}
                                maxLength={255}
                                aria-invalid={showNameError && isNameMissing}
                                onChange={event => update({ name: event.target.value })}
                            />
                        </div>
                    </div>
                    {showNameError && isNameMissing ? (
                        <p className="-mt-4 mb-0 text-xs text-n-ruby-11">{t('AI_AGENTS.FORM.NAME_REQUIRED')}</p>
                    ) : null}

                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-n-slate-12">{t('AI_AGENTS.FORM.CHANNELS')}</span>
                        <p className="m-0 text-xs text-n-slate-11">{t('AI_AGENTS.FORM.CHANNELS_HINT')}</p>
                        {inboxes.length === 0 ? (
                            <p className="m-0 text-sm text-n-slate-11">{t('AI_AGENTS.FORM.NO_CHANNELS')}</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {inboxes.map(inbox => {
                                    const selected = values.inbox_ids.includes(inbox.id);
                                    const owner =
                                        inbox.ai_agent_id !== null && inbox.ai_agent_id !== aiAgent?.id
                                            ? aiAgents.find(item => item.id === inbox.ai_agent_id)
                                            : undefined;
                                    const platformName = inbox.platform?.name ?? '';
                                    const detail = owner && !selected
                                        ? t('AI_AGENTS.FORM.CHANNEL_TAKEN', { platform: platformName, name: owner.name })
                                        : platformName;

                                    return (
                                        <button
                                            key={inbox.id}
                                            type="button"
                                            aria-pressed={selected}
                                            className={`flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-start ring-1 ring-inset active:scale-[0.97] ${
                                                selected
                                                    ? 'bg-n-blue-2 ring-n-brand'
                                                    : 'bg-n-surface-panel ring-n-weak hover:bg-n-surface-hover'
                                            }`}
                                            onClick={() => toggleInbox(inbox)}
                                        >
                                            <ChannelIcon inbox={inbox} className="size-6 flex-shrink-0" />
                                            <span className="flex min-w-0 flex-col">
                                                <span className="truncate text-sm text-n-slate-12">{inbox.name}</span>
                                                {detail ? <span className="truncate text-xs text-n-slate-11">{detail}</span> : null}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-n-slate-12">{t('AI_AGENTS.FORM.PERSONA')}</span>
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('AI_AGENTS.FORM.PERSONA_PRESETS')}>
                            {[...PERSONA_PRESET_KEYS, CUSTOM_PERSONA].map(choice => (
                                <button
                                    key={choice}
                                    type="button"
                                    aria-pressed={personaChoice === choice}
                                    className={`h-8 rounded px-3 text-xs ring-1 ring-inset active:scale-[0.97] ${
                                        personaChoice === choice
                                            ? 'bg-n-blue-2 text-n-blue-11 ring-n-brand'
                                            : 'bg-n-surface-panel text-n-slate-12 ring-n-weak hover:bg-n-surface-hover'
                                    }`}
                                    onClick={() => choosePreset(choice as PersonaChoice)}
                                >
                                    {personaPresetLabel(choice as PersonaChoice)}
                                </button>
                            ))}
                        </div>
                        <label htmlFor={personaId} className="sr-only">
                            {t('AI_AGENTS.FORM.PERSONA_CONTENT')}
                        </label>
                        <textarea
                            id={personaId}
                            rows={3}
                            className={`${FIELD_CLASS} resize-y`}
                            value={values.persona}
                            maxLength={4000}
                            onChange={event => {
                                update({ persona: event.target.value });
                                setPersonaChoice(matchPersonaPreset(event.target.value));
                            }}
                        />
                        <p className="m-0 text-xs text-n-slate-11">{t('AI_AGENTS.FORM.PERSONA_HINT')}</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor={instructionsId} className="text-sm font-medium text-n-slate-12">
                            {t('AI_AGENTS.FORM.INSTRUCTIONS')}
                        </label>
                        <p className="m-0 text-xs text-n-slate-11">{t('AI_AGENTS.FORM.INSTRUCTIONS_HINT')}</p>
                        <textarea
                            id={instructionsId}
                            rows={5}
                            className={`${FIELD_CLASS} resize-y`}
                            value={values.instructions}
                            maxLength={20000}
                            placeholder={t('AI_AGENTS.FORM.INSTRUCTIONS_PLACEHOLDER')}
                            onChange={event => update({ instructions: event.target.value })}
                        />
                    </div>

                    <p className="m-0 rounded bg-n-alpha-1 px-3 py-2.5 text-xs text-n-slate-11">
                        {t('AI_AGENTS.FORM.GROUNDING_NOTE')}
                    </p>
                </div>
            </SidePanel>

            <ConfirmDialog
                open={takeover.kind === 'replace'}
                title={
                    takeover.kind === 'replace'
                        ? t('AI_AGENTS.REPLACE.TITLE', { old: takeover.current.name, new: newAgentName, channel: takeover.inbox.name })
                        : ''
                }
                description={
                    takeover.kind === 'replace'
                        ? t('AI_AGENTS.REPLACE.DESCRIPTION', { old: takeover.current.name, new: newAgentName })
                        : ''
                }
                cancelLabel={takeover.kind === 'replace' ? t('AI_AGENTS.REPLACE.KEEP', { old: takeover.current.name }) : ''}
                confirmLabel={t('AI_AGENTS.REPLACE.CONFIRM', { new: newAgentName })}
                onConfirm={confirmTakeover}
                onCancel={() => setTakeover({ kind: 'none' })}
            />
        </>
    );
}
