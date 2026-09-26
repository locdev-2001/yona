import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { t } from '../../../../../i18n';
import Code from 'dashboard/components/Code';
import Icon from 'dashboard/components-next/icon/Icon';
import Input from 'dashboard/components-next/input/Input';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, patchJson } from 'dashboard/helper/apiClient';
import { sanitizeAllowedDomains } from 'dashboard/helper/URLHelper';
import SectionCard from '../components/SectionCard';
import type { Inbox } from '../../types';

interface EmbedSectionProps {
    accountId: number;
    inbox: Inbox;
    onInboxUpdated: (inbox: Inbox) => void;
}

// Yona chưa ghi sự kiện "widget đã nạp trên trang nào, lúc nào" (không có bảng
// nào lưu việc này) — nên mục này KHÔNG bịa banner "đang chạy trên…", chỉ nói
// thẳng là chưa có dữ liệu, đúng yêu cầu "đừng làm cho có".
export default function EmbedSection({ accountId, inbox, onInboxUpdated }: EmbedSectionProps) {
    const [domainDraft, setDomainDraft] = useState('');
    const [isSavingDomains, setSavingDomains] = useState(false);
    const domains = (inbox.allowed_domains ?? '').split(',').map(domain => domain.trim()).filter(Boolean);

    const saveDomains = async (nextDomains: string[]) => {
        setSavingDomains(true);
        try {
            const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                channel: { allowed_domains: sanitizeAllowedDomains(nextDomains.join(',')) },
            });
            onInboxUpdated(updated);
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('WIDGET_BUILDER.EMBED.DOMAINS_ERROR'));
        } finally {
            setSavingDomains(false);
        }
    };

    const addDomain = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || !domainDraft.trim()) return;
        event.preventDefault();
        const nextDomains = [...domains, domainDraft.trim()];
        setDomainDraft('');
        void saveDomains(nextDomains);
    };

    const removeDomain = (domain: string) => void saveDomains(domains.filter(item => item !== domain));

    return (
        <SectionCard id="embed" title={t('WIDGET_BUILDER.EMBED.TITLE')} description={t('WIDGET_BUILDER.EMBED.DESCRIPTION')}>
            <p className="flex items-center gap-1.5 text-label-small text-n-slate-11">
                <Icon icon="i-lucide-info" className="size-3.5 shrink-0" />
                {t('WIDGET_BUILDER.EMBED.NO_LOADED_EVENT_YET')}
            </p>

            <div className="rounded-lg bg-n-slate-2 p-3 overflow-auto min-w-0 [&_code]:!bg-n-slate-2 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:whitespace-pre-wrap">
                <Code script={inbox.web_widget_script ?? ''} lang="html" className="!text-start" />
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-n-weak">
                <p className="text-body-main font-medium text-n-slate-12">{t('WIDGET_BUILDER.EMBED.DOMAINS_LABEL')}</p>
                <p className="text-label-small text-n-slate-11">{t('WIDGET_BUILDER.EMBED.DOMAINS_HINT')}</p>
                <div className="flex flex-wrap gap-1.5">
                    {domains.map(domain => (
                        <span
                            key={domain}
                            className="flex items-center gap-1 rounded-full bg-n-slate-3 text-n-slate-12 text-label-small px-2.5 py-1"
                        >
                            {domain}
                            <button
                                type="button"
                                aria-label={t('WIDGET_BUILDER.CHANNELS.REMOVE')}
                                disabled={isSavingDomains}
                                onClick={() => removeDomain(domain)}
                            >
                                <Icon icon="i-lucide-x" className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
                <Input
                    value={domainDraft}
                    disabled={isSavingDomains}
                    placeholder={t('WIDGET_BUILDER.EMBED.DOMAINS_PLACEHOLDER')}
                    onChange={event => setDomainDraft(event.target.value)}
                    onKeyDown={addDomain}
                />
            </div>
        </SectionCard>
    );
}
