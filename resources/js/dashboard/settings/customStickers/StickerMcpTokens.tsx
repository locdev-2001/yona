import { Fragment, useCallback, useEffect, useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import SelectInput from 'dashboard/components-next/select/Select';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { dynamicTime } from 'shared/helpers/timeHelper';
import ConfirmActionDialog from './ConfirmActionDialog';
import type { ConfirmActionRequest } from './ConfirmActionDialog';
import { AI_ASSISTANTS, findAiAssistant } from './aiAssistants';
import type { AiAssistant, AiAssistantId } from './aiAssistants';
import type { StickerMcpTokensApi } from './stickerMcpTokensApi';
import type {
    IssuedStickerMcpToken,
    StickerMcpToken,
    StickerMcpTokenListing,
    StickerMcpTokenScope,
} from './types';

const MS_PER_SECOND = 1000;

// Trùng StickerMcpToken::MAX_NAME_LENGTH ở máy chủ.
const TOKEN_NAME_MAX_LENGTH = 100;

const PLACEHOLDER_PATTERN = /\{(\w+)\}/;

const errorMessage = (error: unknown) => parseApiErrorMessage(error) || t('STICKER_LIBRARY.ACTION_ERROR');

const scopeLabel = (scope: StickerMcpTokenScope) => t(`STICKER_LIBRARY.MCP.SCOPE.${scope}`);

const assistantName = (assistant: AiAssistant) => assistant.productName ?? t(`STICKER_LIBRARY.MCP.ASSISTANTS.${assistant.id}`);

function lastUsedLabel(lastUsedAt: string | null): string {
    if (!lastUsedAt) return t('STICKER_LIBRARY.MCP.NEVER_USED');

    return t('STICKER_LIBRARY.MCP.LAST_USED', { time: dynamicTime(Date.parse(lastUsedAt) / MS_PER_SECOND) });
}

function CopyableValue({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await copyTextToClipboard(value);
            setCopied(true);
        } catch {
            useAlert(t('STICKER_LIBRARY.MCP.COPY_FAILED'));
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <span className="text-sm text-n-slate-11">{label}</span>
            <div className="flex items-start gap-2">
                <code className="min-w-0 flex-1 whitespace-pre-wrap break-all rounded-md bg-n-alpha-2 px-3 py-2 font-mono text-xs text-n-slate-12">{value}</code>
                <Button
                    type="button"
                    sm
                    slate
                    faded
                    icon={copied ? 'i-lucide-check' : 'i-lucide-copy'}
                    label={copied ? t('STICKER_LIBRARY.MCP.COPIED') : t('STICKER_LIBRARY.MCP.COPY')}
                    aria-label={`${t('STICKER_LIBRARY.MCP.COPY')} ${label}`}
                    onClick={copy}
                />
            </div>
        </div>
    );
}

function AssistantPicker({ selected, onSelect }: { selected: AiAssistantId; onSelect: (id: AiAssistantId) => void }) {
    return (
        <div role="radiogroup" aria-label={t('STICKER_LIBRARY.MCP.ASSISTANT_LABEL')} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-n-slate-11">{t('STICKER_LIBRARY.MCP.ASSISTANT_LABEL')}</span>
            {AI_ASSISTANTS.map(assistant => (
                <button
                    key={assistant.id}
                    type="button"
                    role="radio"
                    aria-checked={assistant.id === selected}
                    onClick={() => onSelect(assistant.id)}
                    className={`h-7 rounded-lg px-3 text-sm outline-transparent transition-colors ${assistant.id === selected ? 'bg-n-brand/10 font-medium text-n-blue-11 ring-1 ring-n-brand' : 'bg-n-alpha-1 text-n-slate-12 hover:bg-n-alpha-2'}`}
                >
                    {assistantName(assistant)}
                </button>
            ))}
        </div>
    );
}

function IssuedTokenPanel({ issued, assistant, onDismiss }: { issued: IssuedStickerMcpToken; assistant: AiAssistant; onDismiss: () => void }) {
    return (
        <section role="status" className="flex flex-col gap-3 rounded-lg border border-n-amber-7 bg-n-amber-2 p-4">
            <p className="text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.MCP.CREATED_TITLE')}</p>
            <CopyableValue label={t('STICKER_LIBRARY.MCP.TOKEN_LABEL')} value={issued.token} />
            <CopyableValue
                label={`${assistantName(assistant)}: ${t(`STICKER_LIBRARY.MCP.SETUP_HINT.${assistant.id}`)}`}
                value={assistant.mcpSetup(issued.mcp_url, issued.token)}
            />
            <div>
                <Button type="button" sm label={t('STICKER_LIBRARY.MCP.DISMISS')} onClick={onDismiss} />
            </div>
        </section>
    );
}

// Thay {tên} trong câu dịch bằng khối <code>, giữ nguyên thứ tự câu của từng ngôn ngữ.
function withInlineCode(template: string, values: Record<string, string>): ReactNode[] {
    return template.split(PLACEHOLDER_PATTERN).map((part, index) =>
        index % 2 === 1 && part in values ? (
            <code key={index} className="rounded bg-n-alpha-2 px-1 py-0.5 font-mono text-xs text-n-slate-12">
                {values[part]}
            </code>
        ) : (
            <Fragment key={index}>{part}</Fragment>
        ),
    );
}

function SkillCard({
    downloadUrl,
    skill,
    assistant,
}: {
    downloadUrl: string;
    skill: StickerMcpTokenListing['meta']['skill'];
    assistant: AiAssistant;
}) {
    return (
        <section className="flex flex-col gap-3 rounded-lg border border-n-weak p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="m-0 text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.MCP.SKILL.TITLE')}</h3>
                    <p className="m-0 text-sm text-n-slate-11">{t('STICKER_LIBRARY.MCP.SKILL.DESCRIPTION')}</p>
                </div>
                <a
                    href={downloadUrl}
                    download
                    className="inline-flex h-8 items-center gap-2 rounded-lg bg-n-slate-9/10 px-3 text-sm text-n-slate-12 no-underline outline-transparent transition-all duration-100 ease-out hover:bg-n-slate-9/20 focus-visible:bg-n-slate-9/20"
                >
                    <span className="i-lucide-download size-4 flex-shrink-0" aria-hidden="true" />
                    {t('STICKER_LIBRARY.MCP.SKILL.DOWNLOAD')}
                </a>
            </div>
            <p className="m-0 text-sm text-n-slate-11">
                {assistant.skillsDirectory
                    ? withInlineCode(t('STICKER_LIBRARY.MCP.SKILL.INSTALL_AT'), { path: `${assistant.skillsDirectory}/${skill.name}/` })
                    : withInlineCode(t('STICKER_LIBRARY.MCP.SKILL.INSTALL_OTHER'), { name: skill.name })}{' '}
                {withInlineCode(t('STICKER_LIBRARY.MCP.SKILL.USE_PROMPT'), { prompt: skill.prompt })}
            </p>
        </section>
    );
}

function TokenRow({ token, onRevoke }: { token: StickerMcpToken; onRevoke: (token: StickerMcpToken) => void }) {
    return (
        <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-n-slate-12">{token.name}</span>
                <span className="text-xs text-n-slate-11">
                    {[
                        scopeLabel(token.scope),
                        token.created_by ? t('STICKER_LIBRARY.MCP.CREATED_BY', { name: token.created_by }) : null,
                        lastUsedLabel(token.last_used_at),
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
            </div>
            <Button
                type="button"
                sm
                ruby
                faded
                icon="i-lucide-trash-2"
                label={t('STICKER_LIBRARY.MCP.REVOKE')}
                aria-label={`${t('STICKER_LIBRARY.MCP.REVOKE')} ${token.name}`}
                onClick={() => onRevoke(token)}
            />
        </li>
    );
}

// Khối "MCP cho AI" của trang Kho sticker: skill tải về, tạo, liệt kê, thu hồi token. Token thô
// chỉ nằm trong state của lượt tạo, đóng khung là mất.
export default function StickerMcpTokens({ api }: { api: StickerMcpTokensApi }) {
    const scopeSelectId = useId();
    const [listing, setListing] = useState<StickerMcpTokenListing | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [name, setName] = useState('');
    const [scope, setScope] = useState<StickerMcpTokenScope | ''>('');
    const [creating, setCreating] = useState(false);
    const [issued, setIssued] = useState<IssuedStickerMcpToken | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmActionRequest | null>(null);
    const [assistantId, setAssistantId] = useState<AiAssistantId>(AI_ASSISTANTS[0].id);
    const assistant = findAiAssistant(assistantId);
    const closeConfirmation = useCallback(() => setConfirmation(null), []);

    const load = useCallback(async () => {
        setLoadFailed(false);
        try {
            const nextListing = await api.listTokens();
            setListing(nextListing);
            setScope(current => current || nextListing.meta.usable_scopes[0] || '');
        } catch {
            setLoadFailed(true);
        }
    }, [api]);

    useEffect(() => {
        void load();
    }, [load]);

    const create = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName || !scope) return;

        setCreating(true);
        try {
            const created = await api.createToken(trimmedName, scope);
            setIssued(created);
            setName('');
            const { token: _plainTextToken, mcp_url: _mcpUrl, ...listed } = created;
            setListing(current => (current ? { ...current, payload: [listed, ...current.payload] } : current));
        } catch (error) {
            useAlert(errorMessage(error));
        } finally {
            setCreating(false);
        }
    };

    const revoke = async (token: StickerMcpToken) => {
        try {
            await api.revokeToken(token.id);
            setListing(current =>
                current ? { ...current, payload: current.payload.filter(listed => listed.id !== token.id) } : current,
            );
            useAlert(t('STICKER_LIBRARY.MCP.REVOKED'));
        } catch (error) {
            useAlert(errorMessage(error));
        }
    };

    const confirmRevoke = (token: StickerMcpToken) =>
        setConfirmation({
            title: t('STICKER_LIBRARY.MCP.REVOKE_TITLE'),
            message: t('STICKER_LIBRARY.MCP.REVOKE_CONFIRM', { name: token.name }),
            confirmLabel: t('STICKER_LIBRARY.MCP.REVOKE'),
            onConfirm: () => void revoke(token),
        });

    if (loadFailed) {
        return (
            <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-n-ruby-11">{t('STICKER_LIBRARY.MCP.LOAD_ERROR')}</p>
                <Button type="button" sm slate faded label={t('STICKER_LIBRARY.RETRY')} onClick={() => void load()} />
            </div>
        );
    }

    if (!listing) {
        return <p className="text-sm text-n-slate-11">{t('STICKER_LIBRARY.MCP.LOADING')}</p>;
    }

    const usableScopes = listing.meta.usable_scopes;

    return (
        <div className="flex flex-col gap-6">
            <p className="text-sm text-n-slate-11">{t('STICKER_LIBRARY.MCP.DESCRIPTION')}</p>
            <AssistantPicker selected={assistantId} onSelect={setAssistantId} />

            {issued && <IssuedTokenPanel issued={issued} assistant={assistant} onDismiss={() => setIssued(null)} />}

            <form onSubmit={create} className="flex flex-wrap items-end gap-3">
                <div className="min-w-60 flex-1">
                    <Input
                        label={t('STICKER_LIBRARY.MCP.NAME_LABEL')}
                        placeholder={t('STICKER_LIBRARY.MCP.NAME_PLACEHOLDER')}
                        value={name}
                        maxLength={TOKEN_NAME_MAX_LENGTH}
                        onChange={event => setName(event.target.value)}
                    />
                </div>
                {usableScopes.length > 1 && (
                    <div className="flex min-w-48 flex-col gap-1">
                        <label htmlFor={scopeSelectId} className="text-sm font-medium text-n-slate-12">
                            {t('STICKER_LIBRARY.MCP.SCOPE_LABEL')}
                        </label>
                        <SelectInput
                            id={scopeSelectId}
                            value={scope}
                            options={usableScopes.map(usableScope => ({ value: usableScope, label: scopeLabel(usableScope) }))}
                            onChange={value => setScope(value as StickerMcpTokenScope)}
                        />
                    </div>
                )}
                <Button
                    type="submit"
                    icon="i-lucide-key-round"
                    label={t('STICKER_LIBRARY.MCP.CREATE')}
                    isLoading={creating}
                    disabled={creating || !name.trim() || !scope}
                />
            </form>

            <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.MCP.LIST_TITLE')}</h3>
                {listing.payload.length === 0 ? (
                    <p className="text-sm text-n-slate-11">{t('STICKER_LIBRARY.MCP.EMPTY')}</p>
                ) : (
                    <ul className="m-0 list-none divide-y divide-n-weak rounded-lg border border-n-weak p-0">
                        {listing.payload.map(token => (
                            <TokenRow key={token.id} token={token} onRevoke={confirmRevoke} />
                        ))}
                    </ul>
                )}
            </section>

            <SkillCard downloadUrl={api.skillDownloadUrl} skill={listing.meta.skill} assistant={assistant} />

            <ConfirmActionDialog request={confirmation} onClose={closeConfirmation} />
        </div>
    );
}
