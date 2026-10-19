import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../../../i18n';

// Slot #footer dùng chung của BulkAgentActions.vue và BulkTeamActions.vue.
interface ConfirmationFooterProps {
    label: ReactNode;
    isUpdating: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function ConfirmationFooter({ label, isUpdating, onCancel, onConfirm }: ConfirmationFooterProps) {
    return (
        <div className="pt-2 pb-2 px-2 sticky bottom-0 rounded-b-md z-20 bg-n-surface-canvas">
            <div className="flex flex-col gap-2">
                <p className="text-xs text-n-slate-11 px-1 mb-0">{label}</p>
                <div className="flex gap-2">
                    <Button sm faded slate className="flex-1" label={t('BULK_ACTION.CANCEL')} onClick={onCancel} />
                    <Button
                        sm
                        className="flex-1"
                        label={t('BULK_ACTION.YES')}
                        disabled={isUpdating}
                        isLoading={isUpdating}
                        onClick={onConfirm}
                    />
                </div>
            </div>
        </div>
    );
}
