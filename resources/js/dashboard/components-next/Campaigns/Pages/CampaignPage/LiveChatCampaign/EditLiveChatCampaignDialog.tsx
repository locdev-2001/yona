import { useCallback, useRef, useState } from 'react';
import type { Ref } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';

import { t } from '../../../../../../i18n';
import LiveChatCampaignForm from './LiveChatCampaignForm';
import type { LiveChatCampaignFormHandle } from './LiveChatCampaignForm';
import type { Campaign, LiveChatCampaignPayload } from '../../../types';

// Port từ components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/EditLiveChatCampaignDialog.vue.
interface EditLiveChatCampaignDialogProps {
    selectedCampaign: Campaign | null;
    isUpdating: boolean;
    ref?: Ref<DialogHandle>;
    onSubmit: (payload: LiveChatCampaignPayload) => void;
}

export default function EditLiveChatCampaignDialog({
    selectedCampaign,
    isUpdating,
    ref,
    onSubmit,
}: EditLiveChatCampaignDialogProps) {
    const formRef = useRef<LiveChatCampaignFormHandle>(null);
    const [isInvalidForm, setInvalidForm] = useState(false);
    const onValidityChange = useCallback((isSubmitDisabled: boolean) => setInvalidForm(isSubmitDisabled), []);

    const submit = () => {
        const details = formRef.current?.prepareCampaignDetails();
        if (details) onSubmit(details);
    };

    return (
        <Dialog
            ref={ref}
            type="edit"
            title={t('CAMPAIGN.LIVE_CHAT.EDIT.TITLE')}
            isLoading={isUpdating}
            disableConfirmButton={isUpdating || isInvalidForm}
            overflowYAuto
            onConfirm={submit}
        >
            <LiveChatCampaignForm
                ref={formRef}
                mode="edit"
                selectedCampaign={selectedCampaign}
                showActionButtons={false}
                embedded
                onValidityChange={onValidityChange}
                onSubmit={submit}
            />
        </Dialog>
    );
}
