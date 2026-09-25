import { useState } from 'react';
import { router } from '@inertiajs/react';

import { t } from '../../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import NextButton from 'dashboard/components-next/button/Button';

// Người đã đăng nhập: tham gia một chạm, không cần nhập lại thông tin.
export default function OneClickJoin({ token, email }: { token: string; email: string }) {
    const [isJoining, setJoining] = useState(false);

    const join = () => {
        if (isJoining) return;
        setJoining(true);
        router.post(
            `/invite/${token}`,
            {},
            {
                onError: () => useAlert(t('INVITE_LINKS.PAGE.API.ERROR_MESSAGE')),
                onFinish: () => setJoining(false),
            },
        );
    };

    return (
        <div className="w-full space-y-3">
            <p className="text-sm text-n-slate-11">{t('INVITE_LINKS.PAGE.JOIN.LOGGED_IN_AS', { email })}</p>
            <NextButton
                lg
                type="button"
                className="w-full font-medium"
                label={t('INVITE_LINKS.PAGE.JOIN.BUTTON')}
                isLoading={isJoining}
                onClick={join}
            />
        </div>
    );
}
