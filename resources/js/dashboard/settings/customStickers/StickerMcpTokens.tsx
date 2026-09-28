import { useCallback, useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import SelectInput from 'dashboard/components-next/select/Select';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { dynamicTime } from 'shared/helpers/timeHelper';
import { claudeMcpAddCommand } from './stickerMcpTokensApi';
import type { StickerMcpTokensApi } from './stickerMcpTokensApi';
import type { IssuedStickerMcpToken, StickerMcpToken, StickerMcpTokenListing, StickerMcpTokenScope } from './types';

const MS_PER_SECOND = 1000;

// Trùng StickerMcpToken::MAX_NAME_LENGTH ở máy chủ.
const TOKEN_NAME_MAX_LENGTH = 100;

const errorMessage = (error: unknown) => parseApiErrorMessage(error) || t('STICKER_LIBRARY.ACTION_ERROR');

const scopeLabel = (scope: StickerMcpTokenScope) => t(`STICKER_LIBRARY.MCP.SCOPE.${scope}`);

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
                <code className="min-w-0 flex-1 break-all rounded-md bg-n-alpha-2 px-3 py-2 font-mono text-xs text-n-slate-12">{value}</code>
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

function IssuedTokenPanel({ issued, onDismiss }: { issued: IssuedStickerMcpToken; onDismiss: () => void }) {
    return (
        <section role="status" className="flex flex-col gap-3 rounded-lg border border-n-amber-7 bg-n-amber-2 p-4">
            <p className="text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.MCP.CREATED_TITLE')}</p>
            <CopyableValue label={t('STICKER_LIBRARY.MCP.TOKEN_LABEL')} value={issued.token} />
            <CopyableValue label={t('STICKER_LIBRARY.MCP.COMMAND_LABEL')} value={claudeMcpAddCommand(issued.mcp_url, issued.token)} />
            <div>
                <Button type="button" sm label={t('STICKER_LIBRARY.MCP.DISMISS')} onClick={onDismiss} />
            </div>
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

// Khối "MCP cho AI" của trang Kho sticker: tạo, liệt kê, thu hồi token. Token thô
// chỉ nằm trong state của lượt tạo, đóng khung là mất.
export default function StickerMcpTokens({ api }: { api: StickerMcpTokensApi }) {
    const scopeSelectId = useId();
    const [listing, setListing] = useState<StickerMcpTokenListing | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [name, setName] = useState('');
    const [scope, setScope] = useState<StickerMcpTokenScope | ''>('');
    const [creating, setCreating] = useState(false);
    const [issued, setIssued] = useState<IssuedStickerMcpToken | null>(null);

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
        if (!window.confirm(t('STICKER_LIBRARY.MCP.REVOKE_CONFIRM', { name: token.name }))) return;

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

            {issued && <IssuedTokenPanel issued={issued} onDismiss={() => setIssued(null)} />}

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
                            <TokenRow key={token.id} token={token} onRevoke={revoke} />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
