import { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';

import { t } from '../../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Loader from 'shared/components/loader/Loader';
import { getJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import SectionCard from '../components/SectionCard';
import type { Campaign } from 'dashboard/components-next/Campaigns/types';

const AUDIENCE_LABEL_KEYS: Record<string, string> = {
    all: 'WIDGET_BUILDER.INVITE.AUDIENCE_ALL',
    new: 'WIDGET_BUILDER.INVITE.AUDIENCE_NEW',
    returning: 'WIDGET_BUILDER.INVITE.AUDIENCE_RETURNING',
};

interface InviteSectionProps {
    accountId: number;
    inboxId: number;
}

// Lời mời chủ động dùng lại đúng module chiến dịch live chat đã có (Campaign);
// đây chỉ là danh sách tóm tắt + lối vào form tạo/sửa hiện có, không dựng lại
// một bộ CRUD riêng cho việc này.
export default function InviteSection({ accountId, inboxId }: InviteSectionProps) {
    const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
    const manageUrl = accountScopedUrl(accountId, 'campaigns/live_chat');

    useEffect(() => {
        let active = true;
        getJson<Campaign[]>(`/api/v1/accounts/${accountId}/campaigns`)
            .then(all => {
                if (active) setCampaigns(all.filter(campaign => campaign.inbox?.id === inboxId));
            })
            .catch(() => {
                if (active) setCampaigns([]);
            });

        return () => {
            active = false;
        };
    }, [accountId, inboxId]);

    return (
        <SectionCard
            id="invite"
            title={t('WIDGET_BUILDER.INVITE.TITLE')}
            description={t('WIDGET_BUILDER.INVITE.DESCRIPTION')}
            action={
                <Button
                    size="sm"
                    icon="i-lucide-plus"
                    label={t('WIDGET_BUILDER.INVITE.ADD')}
                    onClick={() => router.visit(manageUrl)}
                />
            }
        >
            {campaigns === null ? (
                <div className="flex justify-center py-6">
                    <Loader size={20} className="text-n-slate-9" />
                </div>
            ) : campaigns.length === 0 ? (
                <p className="text-body-main text-n-slate-11">{t('WIDGET_BUILDER.INVITE.EMPTY')}</p>
            ) : (
                <ul className="flex flex-col">
                    {campaigns.map(campaign => (
                        <li key={campaign.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                                <p className="text-body-main font-medium text-n-slate-12 truncate">{campaign.title}</p>
                                <p className="text-label-small text-n-slate-11">
                                    {t(AUDIENCE_LABEL_KEYS[campaign.show_to ?? 'all'])}
                                    {campaign.quick_replies?.length
                                        ? ` · ${t('WIDGET_BUILDER.INVITE.QUICK_REPLIES_COUNT', { count: campaign.quick_replies.length })}`
                                        : ''}
                                </p>
                            </div>
                            <span
                                className={`shrink-0 rounded-full text-label-small font-medium px-2.5 py-1 ${
                                    campaign.enabled ? 'bg-n-teal-3 text-n-teal-11' : 'bg-n-slate-3 text-n-slate-11'
                                }`}
                            >
                                {t(campaign.enabled ? 'WIDGET_BUILDER.INVITE.STATUS_ON' : 'WIDGET_BUILDER.INVITE.STATUS_OFF')}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <Link href={manageUrl} className="text-label-small text-n-blue-11 hover:underline self-start">
                {t('WIDGET_BUILDER.INVITE.MANAGE_LINK')}
            </Link>
        </SectionCard>
    );
}
