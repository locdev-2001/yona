import { useCallback, useEffect, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import { t } from '../../../../i18n';
import { createGroupInviteLink, fetchGroupInviteLinks, revokeGroupInviteLink } from '../../groupsApi';
import type { GroupInviteLink } from '../../groupsApi';

// Link mời của nhóm (chỉ quản trị): mỗi nhóm một link đang dùng, luôn hiện đầy đủ để chép lại;
// tạo link mới thì máy chủ thu hồi link cũ. Link tạo trước khi máy chủ lưu token không dựng lại được.
export default function GroupInviteLinks({ accountId, groupId }: { accountId: number; groupId: number }) {
    const [links, setLinks] = useState<GroupInviteLink[]>([]);
    const [isCreating, setCreating] = useState(false);

    const reload = useCallback(() => {
        fetchGroupInviteLinks(accountId, groupId)
            .then(all => setLinks(all.filter(link => link.status === 'active')))
            .catch(() => setLinks([]));
    }, [accountId, groupId]);

    useEffect(() => {
        reload();
    }, [reload]);

    const fail = (error: unknown) => useAlert(parseApiErrorMessage(error) || t('CHAT.GROUP.ERROR'));

    const create = async () => {
        setCreating(true);
        try {
            await createGroupInviteLink(accountId, groupId);
            reload();
        } catch (error) {
            fail(error);
        } finally {
            setCreating(false);
        }
    };

    const copy = async (url: string) => {
        try {
            await copyTextToClipboard(url);
            useAlert(t('CHAT.GROUP.COPIED'));
        } catch (error) {
            fail(error);
        }
    };

    const revoke = async (linkId: number) => {
        try {
            await revokeGroupInviteLink(accountId, groupId, linkId);
            reload();
            useAlert(t('CHAT.GROUP.INVITE_REVOKED'));
        } catch (error) {
            fail(error);
        }
    };

    const describe = (link: GroupInviteLink) =>
        t('CHAT.GROUP.INVITE_ACTIVE', {
            uses: [
                t('CHAT.GROUP.INVITE_USES', { count: link.use_count }),
                link.expires_at
                    ? t('CHAT.GROUP.INVITE_EXPIRES', { date: messageTimestamp(link.expires_at, 'd/M/yyyy') })
                    : t('CHAT.GROUP.INVITE_NO_EXPIRY'),
            ].join(' · '),
        });

    return (
        <section className="flex flex-col gap-3 px-4 py-4 border-b border-n-weak" aria-labelledby="group-invite-title">
            <h3 id="group-invite-title" className="m-0 text-sm font-medium text-n-slate-12">
                {t('CHAT.GROUP.INVITE_LINK')}
            </h3>
            <p className="m-0 text-xs text-n-slate-11">{t('CHAT.GROUP.INVITE_HINT')}</p>
            {links.length > 0 ? (
                <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                    {links.map(link => (
                        <li key={link.id} className="flex flex-col gap-1">
                            {link.url ? (
                                <div className="flex items-center gap-2">
                                    <span
                                        data-testid="group-invite-url"
                                        className="field-surface flex items-center flex-1 min-w-0 h-10 px-3 rounded-lg text-sm text-n-slate-12 truncate"
                                    >
                                        {link.url.replace(/^https?:\/\//, '')}
                                    </span>
                                    <Button sm label={t('CHAT.GROUP.COPY')} icon="i-lucide-copy" onClick={() => void copy(link.url as string)} />
                                </div>
                            ) : (
                                <p className="m-0 text-xs text-n-slate-11">{t('CHAT.GROUP.INVITE_LEGACY')}</p>
                            )}
                            <div className="flex items-center justify-between gap-2 text-xs text-n-slate-11">
                                <span className="min-w-0 truncate">{describe(link)}</span>
                                <Button link ruby xs label={t('CHAT.GROUP.INVITE_REVOKE')} onClick={() => void revoke(link.id)} />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="m-0 text-xs text-n-slate-11">{t('CHAT.GROUP.INVITE_EMPTY')}</p>
            )}
            <Button faded slate sm icon="i-lucide-link" label={t(links.length > 0 ? 'CHAT.GROUP.INVITE_RENEW' : 'CHAT.GROUP.INVITE_CREATE')} isLoading={isCreating} className="self-start" onClick={() => void create()} />
        </section>
    );
}
