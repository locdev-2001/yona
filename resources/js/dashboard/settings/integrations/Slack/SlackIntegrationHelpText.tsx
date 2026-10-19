import DOMPurify from 'dompurify';

import { t } from '../../../../i18n';
import MessageFormatter from 'shared/helpers/MessageFormatter';

// Port từ dashboard/routes/dashboard/settings/integrations/Slack/SlackIntegrationHelpText.vue
interface SlackIntegrationHelpTextProps {
    selectedChannelName: string;
}

export default function SlackIntegrationHelpText({ selectedChannelName }: SlackIntegrationHelpTextProps) {
    const formattedHelpText = new MessageFormatter(
        t('INTEGRATION_SETTINGS.SLACK.HELP_TEXT.BODY', { selectedChannelName }),
        false,
    ).formattedMessage;

    return (
        <div className="flex-1 w-full px-6 py-5 panel-surface rounded-xl">
            <div className="prose-lg max-w-5xl">
                <h5 className="text-n-slate-12 text-heading-1 tracking-tight">
                    {t('INTEGRATION_SETTINGS.SLACK.HELP_TEXT.TITLE')}
                </h5>
                <div
                    className="text-n-slate-11 text-body-main"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedHelpText) }}
                />
            </div>
        </div>
    );
}
