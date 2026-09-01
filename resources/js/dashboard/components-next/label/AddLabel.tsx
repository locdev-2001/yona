import { t } from '../../../i18n';

// Port từ dashboard/components-next/label/AddLabel.vue — shell B2:
// nút "+ tag" viền đứt hiển thị đúng; DropdownMenu chọn label mở ở nhóm C
// (labels), cùng pattern giữ chỗ như nút filter/New message.
export default function AddLabel() {
    return (
        <div className="relative">
            <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 rounded-md outline-dashed h-6 outline-1 outline-n-slate-6 hover:bg-n-alpha-2"
            >
                <span className="i-lucide-plus" />
                <span className="text-sm text-n-slate-11">{t('LABEL.TAG_BUTTON')}</span>
            </button>
        </div>
    );
}
