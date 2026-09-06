import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../../../i18n';

// Port từ DatePicker/components/CalendarFooter.vue
export default function CalendarFooter({ onClear, onChange }: { onClear: () => void; onChange: () => void }) {
    return (
        <div className="h-[56px] flex justify-between gap-2 px-2 py-3 items-center">
            <Button slate ghost sm label={t('DATE_PICKER.CLEAR_BUTTON')} onClick={onClear} />
            <Button sm label={t('DATE_PICKER.APPLY_BUTTON')} onClick={onChange} />
        </div>
    );
}
