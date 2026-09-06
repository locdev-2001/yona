import { t } from '../../../../i18n';
import { getI18nKey } from '../../helper/settingsHelper';
import ShowMore from 'dashboard/components/widgets/ShowMore';
import Button from 'dashboard/components-next/button/Button';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import type { Webhook } from 'dashboard/composables/useWebhooks';

// Port từ dashboard/routes/dashboard/settings/integrations/Webhooks/WebhookRow.vue.
interface WebhookRowProps {
    webhook: Webhook;
    onEdit: (webhook: Webhook) => void;
    onDelete: (webhook: Webhook) => void;
}

export default function WebhookRow({ webhook, onEdit, onDelete }: WebhookRowProps) {
    const subscribedEvents = webhook.subscriptions
        .map(event => t(getI18nKey('INTEGRATION_SETTINGS.WEBHOOK.FORM.SUBSCRIPTIONS.EVENTS', event)))
        .join(', ');

    return (
        <BaseTableRow>
            <BaseTableCell>
                <div className="flex gap-2 font-medium break-words text-n-slate-12">
                    {webhook.name ? (
                        <>
                            {webhook.name}
                            <span className="text-n-slate-11">{webhook.url}</span>
                        </>
                    ) : (
                        webhook.url
                    )}
                </div>
                <div className="block mt-1 text-sm text-n-slate-11">
                    <span className="font-medium">
                        {t('INTEGRATION_SETTINGS.WEBHOOK.SUBSCRIBED_EVENTS')}:
                    </span>{' '}
                    <ShowMore text={subscribedEvents} limit={60} />
                </div>
            </BaseTableCell>

            <BaseTableCell align="end" className="w-24">
                <div className="flex justify-end gap-3 flex-shrink-0">
                    <Button
                        title={t('INTEGRATION_SETTINGS.WEBHOOK.EDIT.BUTTON_TEXT')}
                        icon="i-woot-edit-pen"
                        slate
                        sm
                        onClick={() => onEdit(webhook)}
                    />
                    <Button
                        title={t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.BUTTON_TEXT')}
                        icon="i-woot-bin"
                        slate
                        sm
                        className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                        onClick={() => onDelete(webhook)}
                    />
                </div>
            </BaseTableCell>
        </BaseTableRow>
    );
}
