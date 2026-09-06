import { usePage } from '@inertiajs/react';
import { formatTime } from '@chatwoot/utils';
import { format, fromUnixTime } from 'date-fns';

import Icon from 'dashboard/components-next/icon/Icon';
import TimeAgo from 'dashboard/components/ui/TimeAgo';
import { conversationUrl, frontendURL } from 'dashboard/helper/URLHelper';
import { shortTimestamp } from 'shared/helpers/timeHelper';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import type { DrilldownRecord } from '../types';

// Port từ reports/components/ReportDrilldownCard.vue

const formatTimestamp = (timestamp?: number) => (timestamp ? format(fromUnixTime(timestamp), 'dd MMM yyyy, h:mm a') : '');
const compactTimestamp = (timestamp?: number) => (timestamp ? shortTimestamp(timestamp).trim() : '');

export default function ReportDrilldownCard({ record }: { record: DrilldownRecord }) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const conversation = record.conversation || {};
    const message = record.message || {};
    const isMessageRecord = record.record_type === 'message';
    const isEventBackedConversationRecord = !isMessageRecord && Boolean(record.event_name);
    const conversationNumber = `#${conversation.display_id}`;

    const metricValue =
        record.metric_value === null || record.metric_value === undefined
            ? ''
            : formatTime(record.metric_value) || `${record.metric_value}`;

    const previewText =
        message.content || conversation.last_message?.content || t('REPORT.DRILLDOWN.NO_MESSAGE_CONTENT');
    const showPreview = isMessageRecord || Boolean(conversation.last_message);

    const directionDetails = message.message_type
        ? {
              icon: message.message_type === 'incoming' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right',
              tooltip:
                  message.message_type === 'incoming'
                      ? t('REPORT.DRILLDOWN.INCOMING_MESSAGE')
                      : t('REPORT.DRILLDOWN.OUTGOING_MESSAGE'),
          }
        : null;

    const conversationPath = conversation.display_id
        ? `${frontendURL(conversationUrl({ accountId, id: conversation.display_id }).replace('/app/', ''))}${
              isMessageRecord && message.id ? `?messageId=${message.id}` : ''
          }`
        : '';

    const metadataItems = [
        {
            key: 'contact',
            icon: 'i-lucide-contact',
            label: conversation.contact_name || t('REPORT.DRILLDOWN.UNKNOWN_CONTACT'),
            path: conversation.contact_id ? frontendURL(`accounts/${accountId}/contacts/${conversation.contact_id}`) : '',
        },
        {
            key: 'inbox',
            icon: 'i-lucide-inbox',
            label: conversation.inbox_name || t('REPORT.DRILLDOWN.UNKNOWN_INBOX'),
            path: conversation.inbox_id ? frontendURL(`accounts/${accountId}/inbox/${conversation.inbox_id}`) : '',
        },
        {
            key: 'agent',
            icon: 'i-lucide-user-round',
            label: conversation.assignee_name || t('REPORT.DRILLDOWN.UNASSIGNED_AGENT'),
            path: conversation.assignee_id
                ? frontendURL(`accounts/${accountId}/reports/agents/${conversation.assignee_id}`)
                : '',
        },
    ];

    const openRecord = () => {
        if (conversationPath) window.open(conversationPath, '_blank', 'noopener,noreferrer');
    };

    const messageCreatedTooltip = t('REPORT.DRILLDOWN.MESSAGE_CREATED_AT', {
        time: formatTimestamp(message.created_at),
    });
    const eventOccurredTooltip = t('REPORT.DRILLDOWN.EVENT_OCCURRED_AT', { time: formatTimestamp(record.occurred_at) });

    return (
        <article
            role="link"
            tabIndex={0}
            className="cursor-pointer rounded-md border border-n-weak bg-n-solid-2 p-3 hover:bg-n-alpha-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
            onClick={openRecord}
            onKeyDown={event => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openRecord();
                }
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium leading-5 text-n-slate-12">
                        <span>{conversationNumber}</span>
                        {conversation.status && (
                            <span className="rounded bg-n-alpha-2 px-1.5 py-0.5 text-xs capitalize text-n-slate-11">
                                {conversation.status}
                            </span>
                        )}
                        {directionDetails && (
                            <span
                                title={directionDetails.tooltip}
                                aria-label={directionDetails.tooltip}
                                className="flex size-5 items-center justify-center rounded bg-n-alpha-2 text-n-slate-11"
                            >
                                <Icon icon={directionDetails.icon} className="size-3" />
                            </span>
                        )}
                        {metricValue && (
                            <span className="rounded bg-n-alpha-2 px-1.5 py-0.5 text-xs text-n-slate-11">
                                {metricValue}
                            </span>
                        )}
                    </div>
                </div>
                <div className="ms-2 flex shrink-0 items-center justify-end gap-1 text-end text-xs leading-4 text-n-slate-10">
                    {isMessageRecord ? (
                        <span title={messageCreatedTooltip} aria-label={messageCreatedTooltip} className="whitespace-nowrap">
                            {compactTimestamp(message.created_at)}
                        </span>
                    ) : (
                        <TimeAgo
                            isAutoRefreshEnabled={false}
                            conversationId={conversation.id}
                            lastActivityTimestamp={conversation.last_activity_at ?? 0}
                            createdAtTimestamp={conversation.created_at ?? 0}
                            className="font-440 !text-xs !text-n-slate-10"
                        />
                    )}
                    {isEventBackedConversationRecord && (
                        <span
                            title={eventOccurredTooltip}
                            aria-label={eventOccurredTooltip}
                            className="whitespace-nowrap rounded bg-n-alpha-2 px-1 py-0.5 text-[11px] leading-4 text-n-slate-10"
                        >
                            {compactTimestamp(record.occurred_at)}
                        </span>
                    )}
                </div>
            </div>

            {showPreview && <p className="mt-2 line-clamp-1 text-sm leading-5 text-n-slate-12">{previewText}</p>}

            <div className="mt-2 grid grid-cols-3 gap-2">
                {metadataItems.map(item => {
                    const className = [
                        'text-body-main flex min-w-0 items-center gap-1 text-n-slate-10',
                        item.path ? 'group hover:text-n-blue-11 hover:underline' : '',
                    ]
                        .filter(Boolean)
                        .join(' ');
                    const iconClass = ['size-3 shrink-0 text-n-slate-9', item.path ? 'group-hover:text-n-blue-11' : '']
                        .filter(Boolean)
                        .join(' ');

                    return item.path ? (
                        <a
                            key={item.key}
                            href={item.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={className}
                            onClick={event => event.stopPropagation()}
                        >
                            <Icon icon={item.icon} className={iconClass} />
                            <span className="truncate">{item.label}</span>
                        </a>
                    ) : (
                        <span key={item.key} className={className}>
                            <Icon icon={item.icon} className={iconClass} />
                            <span className="truncate">{item.label}</span>
                        </span>
                    );
                })}
            </div>
        </article>
    );
}
