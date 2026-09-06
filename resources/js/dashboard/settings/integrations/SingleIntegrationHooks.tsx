import { t } from '../../../i18n';
import { useBranding } from 'shared/composables/useBranding';
import Button from 'dashboard/components-next/button/Button';
import type { IntegrationApp, IntegrationHook } from 'dashboard/composables/useIntegrationApps';

// Port từ dashboard/routes/dashboard/settings/integrations/SingleIntegrationHooks.vue.
interface SingleIntegrationHooksProps {
    integration: IntegrationApp;
    onAdd: () => void;
    onDelete: (hook: IntegrationHook) => void;
}

export default function SingleIntegrationHooks({
    integration,
    onAdd,
    onDelete,
}: SingleIntegrationHooksProps) {
    const { replaceInstallationName } = useBranding();
    const hasConnectedHooks = Boolean(integration.hooks?.length);

    return (
        <div className="outline outline-n-container outline-1 bg-n-card rounded-xl flex-grow overflow-auto p-4">
            <div className="flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center">
                    <img
                        src={`/dashboard/images/integrations/${integration.id}.png`}
                        className="max-w-full rounded-md border border-n-weak shadow-sm block dark:hidden bg-n-alpha-3 dark:bg-n-alpha-2"
                    />
                    <img
                        src={`/dashboard/images/integrations/${integration.id}-dark.png`}
                        className="max-w-full rounded-md border border-n-weak shadow-sm hidden dark:block bg-n-alpha-3 dark:bg-n-alpha-2"
                    />
                </div>
                <div className="flex flex-col justify-center m-0 mx-4 flex-1">
                    <h3 className="mb-1 text-heading-1 text-n-slate-12">{integration.name}</h3>
                    <p className="text-n-slate-11 text-body-main">
                        {replaceInstallationName(integration.description)}
                    </p>
                </div>
                <div className="flex justify-center items-center mb-0 w-[15%]">
                    {hasConnectedHooks ? (
                        <div onClick={() => onDelete(integration.hooks[0])}>
                            <Button ruby faded label={t('INTEGRATION_APPS.DISCONNECT.BUTTON_TEXT')} />
                        </div>
                    ) : (
                        <Button blue faded label={t('INTEGRATION_APPS.CONNECT.BUTTON_TEXT')} onClick={onAdd} />
                    )}
                </div>
            </div>
        </div>
    );
}
