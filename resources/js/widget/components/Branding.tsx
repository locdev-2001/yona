import SharedBranding from 'shared/components/Branding';

import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';

// Vỏ nối store widget vào component dùng chung (trang khảo sát công khai dùng
// cùng component với cấu hình của nó).
export default function Branding({ disableBranding = false }: { disableBranding?: boolean }) {
    const globalConfig = useWidgetState(state => state.globalConfig);
    const referrerHost = useWidgetState(state => state.appConfig.referrerHost);

    return (
        <SharedBranding
            globalConfig={globalConfig}
            poweredByLabel={t('POWERED_BY')}
            referrerHost={referrerHost}
            disableBranding={disableBranding}
        />
    );
}
