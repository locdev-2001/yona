import type { Ref } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';

import { t } from '../../../../../i18n';

// Port từ components-next/Campaigns/Pages/CampaignPage/ConfirmDeleteCampaignDialog.vue.
interface ConfirmDeleteCampaignDialogProps {
    ref?: Ref<DialogHandle>;
    onConfirm: () => void;
}

export default function ConfirmDeleteCampaignDialog({ ref, onConfirm }: ConfirmDeleteCampaignDialogProps) {
    return (
        <Dialog
            ref={ref}
            type="alert"
            title={t('CAMPAIGN.CONFIRM_DELETE.TITLE')}
            description={t('CAMPAIGN.CONFIRM_DELETE.DESCRIPTION')}
            confirmButtonLabel={t('CAMPAIGN.CONFIRM_DELETE.CONFIRM')}
            onConfirm={onConfirm}
        />
    );
}
