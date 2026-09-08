import { router } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';

// Port từ widgets/conversation/MessageSignatureMissingAlert.vue — hiện khi bật
// chữ ký nhưng agent chưa cấu hình message_signature; link về profile settings.
//
// Lệch có chủ đích (founder 08/09/2026, ux-deviations.md): gốc dựng một khối
// `max-h-[8vh]` cuộn được với hai câu chữ, ăn mất chỗ vốn đã hẹp của ô soạn.
// Yona thu về MỘT dòng và biến cả dòng thành nút mở cài đặt hồ sơ — cùng đích
// đến, cùng một lần bấm, không lấy thêm chiều cao.
export default function MessageSignatureMissingAlert({ accountId, className = '' }: { accountId: number; className?: string }) {
    return (
        <button
            type="button"
            title={t('CONVERSATION.FOOTER.MESSAGE_SIGNATURE_NOT_CONFIGURED')}
            className={`flex w-full items-center gap-1.5 rounded-sm border border-dashed border-n-weak px-1.5 py-0.5 text-xs text-n-slate-11 hover:bg-n-slate-1 hover:text-n-slate-12 cursor-pointer ${className}`}
            onClick={() => router.visit(accountScopedUrl(accountId, 'profile/settings'))}
        >
            <Icon icon="i-lucide-pen-line" className="size-3.5 flex-shrink-0" />
            <span className="truncate">{t('CONVERSATION.FOOTER.MESSAGE_SIGNATURE_NOT_CONFIGURED_SHORT')}</span>
        </button>
    );
}
