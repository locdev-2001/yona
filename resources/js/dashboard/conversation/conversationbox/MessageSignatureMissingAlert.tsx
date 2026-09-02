import { router } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';

// Port từ widgets/conversation/MessageSignatureMissingAlert.vue — hiện khi bật
// chữ ký nhưng agent chưa cấu hình message_signature; link về profile settings.
export default function MessageSignatureMissingAlert({ accountId, className = '' }: { accountId: number; className?: string }) {
    return (
        <div
            className={`my-0 px-1 flex max-h-[8vh] items-baseline justify-between hover:bg-n-slate-1 border border-dashed border-n-weak rounded-sm overflow-auto ${className}`}
        >
            <p className="w-fit !m-0">
                {t('CONVERSATION.FOOTER.MESSAGE_SIGNATURE_NOT_CONFIGURED')}{' '}
                <Button
                    link
                    label={t('CONVERSATION.FOOTER.CLICK_HERE')}
                    onClick={() => router.visit(accountScopedUrl(accountId, 'profile/settings'))}
                />
            </p>
        </div>
    );
}
