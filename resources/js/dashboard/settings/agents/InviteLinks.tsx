import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import Button from 'dashboard/components-next/button/Button';
import ModalHeader from 'dashboard/components/ModalHeader';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import type { CreatedInviteLink, InviteLink } from './types';

// Bổ sung cho mời qua email (AddAgent.tsx): tạo một đường dẫn dùng chung, gửi
// tay qua Zalo — quản trị viên không phải gõ từng email. Vai trò/hạn dùng/giới
// hạn lượt chọn ở đây; chấp nhận lời mời nằm ở trang công khai /invite/{token}
// (v3/views/auth/invite/Index.tsx), không thuộc phạm vi component này.
const EXPIRY_CHOICES: { days: number; labelKey: string }[] = [
    { days: 1, labelKey: 'DAY_1' },
    { days: 7, labelKey: 'DAY_7' },
    { days: 30, labelKey: 'DAY_30' },
];

interface InviteLinksProps {
    accountId: number;
    onClose: () => void;
}

function statusLabel(status: InviteLink['status']): string {
    return t(`INVITE_LINKS.MANAGE.LIST.STATUS.${status.toUpperCase()}`);
}

export default function InviteLinks({ accountId, onClose }: InviteLinksProps) {
    const [links, setLinks] = useState<InviteLink[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [role, setRole] = useState<InviteLink['role']>('agent');
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [maxUses, setMaxUses] = useState('');
    const [isCreating, setCreating] = useState(false);
    const [created, setCreated] = useState<CreatedInviteLink | null>(null);
    const [isCopied, setCopied] = useState(false);
    const [revokingLink, setRevokingLink] = useState<InviteLink | null>(null);
    const [revokingId, setRevokingId] = useState<number | null>(null);

    useEffect(() => {
        let active = true;

        getJson<InviteLink[]>(`/api/v1/accounts/${accountId}/invite_links`)
            .then(list => {
                if (active) setLinks(list);
            })
            .finally(() => {
                if (active) setFetching(false);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    const createLink = async (event: FormEvent) => {
        event.preventDefault();
        if (isCreating) return;

        setCreating(true);
        try {
            const result = await postJson<CreatedInviteLink>(`/api/v1/accounts/${accountId}/invite_links`, {
                role,
                expires_in_days: expiresInDays,
                max_uses: maxUses ? Number(maxUses) : null,
            });
            setCreated(result);
            setCopied(false);
            setLinks(current => [result.link, ...current]);
            useAlert(t('INVITE_LINKS.MANAGE.API.CREATE_SUCCESS'));
        } catch {
            useAlert(t('INVITE_LINKS.MANAGE.API.CREATE_ERROR'));
        } finally {
            setCreating(false);
        }
    };

    const copyUrl = async (url: string) => {
        await copyTextToClipboard(url);
        setCopied(true);
    };

    const shareViaZalo = async (url: string) => {
        if (navigator.share) {
            try {
                await navigator.share({ url });
                return;
            } catch {
                // Người dùng huỷ hộp thoại chia sẻ — coi như không có gì xảy ra.
                return;
            }
        }
        await copyUrl(url);
    };

    const confirmRevoke = async () => {
        const link = revokingLink;
        if (!link) return;

        setRevokingId(link.id);
        setRevokingLink(null);
        try {
            await deleteJson(`/api/v1/accounts/${accountId}/invite_links/${link.id}`);
            setLinks(current =>
                current.map(item =>
                    item.id === link.id ? { ...item, status: 'revoked', revoked_at: new Date().toISOString() } : item,
                ),
            );
            useAlert(t('INVITE_LINKS.MANAGE.API.REVOKE_SUCCESS'));
        } catch {
            useAlert(t('INVITE_LINKS.MANAGE.API.REVOKE_ERROR'));
        } finally {
            setRevokingId(null);
        }
    };

    const toUnixSeconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

    return (
        <div className="flex flex-col h-auto overflow-auto">
            <ModalHeader headerTitle={t('INVITE_LINKS.MANAGE.TITLE')} headerContent={t('INVITE_LINKS.MANAGE.DESC')} />

            <div className="px-8 pb-8">
                {created ? (
                    <div className="mt-4 p-4 rounded-md bg-n-solid-2 outline outline-1 outline-n-container">
                        <p className="text-sm font-medium text-n-slate-12">{t('INVITE_LINKS.MANAGE.CREATED.TITLE')}</p>
                        <p className="text-sm text-n-slate-11 mt-1">{t('INVITE_LINKS.MANAGE.CREATED.HINT')}</p>
                        <div className="flex items-center gap-2 mt-3">
                            <input
                                readOnly
                                value={created.url}
                                className="flex-1 text-sm rounded-md border-0 px-3 py-2 bg-n-alpha-black2 outline outline-1 outline-n-weak text-n-slate-12"
                                onFocus={event => event.currentTarget.select()}
                            />
                            <Button
                                sm
                                slate
                                label={isCopied ? t('INVITE_LINKS.MANAGE.CREATED.COPIED') : t('INVITE_LINKS.MANAGE.CREATED.COPY')}
                                onClick={() => void copyUrl(created.url)}
                            />
                            <Button
                                sm
                                label={t('INVITE_LINKS.MANAGE.CREATED.SHARE_ZALO')}
                                onClick={() => void shareViaZalo(created.url)}
                            />
                        </div>
                    </div>
                ) : null}

                <form className="flex flex-col gap-4 mt-6" onSubmit={event => void createLink(event)}>
                    <label>
                        {t('INVITE_LINKS.MANAGE.FORM.ROLE.LABEL')}
                        <select value={role} onChange={event => setRole(event.target.value as InviteLink['role'])}>
                            <option value="agent">{t('AGENT_MGMT.AGENT_TYPES.AGENT')}</option>
                            <option value="administrator">{t('AGENT_MGMT.AGENT_TYPES.ADMINISTRATOR')}</option>
                        </select>
                    </label>

                    <label>
                        {t('INVITE_LINKS.MANAGE.FORM.EXPIRES.LABEL')}
                        <select value={expiresInDays} onChange={event => setExpiresInDays(Number(event.target.value))}>
                            {EXPIRY_CHOICES.map(choice => (
                                <option key={choice.days} value={choice.days}>
                                    {t(`INVITE_LINKS.MANAGE.FORM.EXPIRES.OPTIONS.${choice.labelKey}`)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        {t('INVITE_LINKS.MANAGE.FORM.MAX_USES.LABEL')}
                        <input
                            type="number"
                            min={1}
                            value={maxUses}
                            placeholder={t('INVITE_LINKS.MANAGE.FORM.MAX_USES.PLACEHOLDER')}
                            onChange={event => setMaxUses(event.target.value)}
                        />
                    </label>

                    <div className="flex justify-end gap-2">
                        <Button faded slate type="button" label={t('INVITE_LINKS.MANAGE.CLOSE')} onClick={onClose} />
                        <Button type="submit" label={t('INVITE_LINKS.MANAGE.FORM.SUBMIT')} isLoading={isCreating} />
                    </div>
                </form>

                <div className="mt-6 divide-y divide-n-weak border-t border-n-weak">
                    {isFetching ? null : links.length === 0 ? (
                        <p className="py-4 text-sm text-n-slate-11">{t('INVITE_LINKS.MANAGE.LIST.EMPTY')}</p>
                    ) : (
                        links.map(link => (
                            <div key={link.id} className="flex items-center justify-between gap-4 py-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm text-n-slate-12">
                                        <span>{t('INVITE_LINKS.MANAGE.LIST.ROLE_LABEL', { role: t(`AGENT_MGMT.AGENT_TYPES.${link.role.toUpperCase()}`) })}</span>
                                        <span className="w-px h-3 bg-n-strong rounded-lg" />
                                        <span>{statusLabel(link.status)}</span>
                                    </div>
                                    <div className="text-sm text-n-slate-11">
                                        {link.max_uses === null
                                            ? t('INVITE_LINKS.MANAGE.LIST.USES_UNLIMITED', { used: link.use_count })
                                            : t('INVITE_LINKS.MANAGE.LIST.USES_LIMITED', { used: link.use_count, max: link.max_uses })}
                                        {' · '}
                                        {t('INVITE_LINKS.MANAGE.LIST.EXPIRES_AT', {
                                            date: messageTimestamp(toUnixSeconds(link.expires_at), 'dd MMM yyyy, h:mm a'),
                                        })}
                                        {link.created_by_name
                                            ? ` · ${t('INVITE_LINKS.MANAGE.LIST.CREATED_BY', { name: link.created_by_name })}`
                                            : ''}
                                    </div>
                                </div>
                                {link.status === 'active' ? (
                                    <Button
                                        sm
                                        slate
                                        label={t('INVITE_LINKS.MANAGE.LIST.REVOKE.BUTTON')}
                                        isLoading={revokingId === link.id}
                                        className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                                        onClick={() => setRevokingLink(link)}
                                    />
                                ) : null}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <DeleteModal
                show={revokingLink !== null}
                onClose={() => setRevokingLink(null)}
                onConfirm={() => void confirmRevoke()}
                title={t('INVITE_LINKS.MANAGE.LIST.REVOKE.CONFIRM.TITLE')}
                message={t('INVITE_LINKS.MANAGE.LIST.REVOKE.CONFIRM.MESSAGE')}
                confirmText={t('INVITE_LINKS.MANAGE.LIST.REVOKE.CONFIRM.YES')}
                rejectText={t('INVITE_LINKS.MANAGE.LIST.REVOKE.CONFIRM.NO')}
            />
        </div>
    );
}
