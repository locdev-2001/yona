import { useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../../../types';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import NextButton from 'dashboard/components-next/button/Button';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import type { AvatarStackPerson } from 'shared/avatar/AvatarStack';
import { conversationAvatarSeed, conversationAvatarStack } from 'shared/avatar/avatarSeed';
import AuthShell, { authCard } from 'v3/components/AuthShell';
import { BrandMark } from '../../../components/BrandMark';

type InviteStatus = 'active' | 'not_found' | 'revoked' | 'expired' | 'exhausted';

interface GroupInvitePageProps extends SharedPageProps {
    status: InviteStatus;
    token: string;
    group: {
        id: number;
        name: string;
        avatar_seed: string | null;
        avatar_members: AvatarStackPerson[];
        member_count: number;
        inviter: string | null;
    } | null;
    openUrl: string | null;
}

const GROUP_AVATAR_SIZE_PX = 72;

const ERROR_STATUS_KEYS: Record<Exclude<InviteStatus, 'active'>, string> = {
    not_found: 'NOT_FOUND',
    revoked: 'REVOKED',
    expired: 'EXPIRED',
    exhausted: 'EXHAUSTED',
};

// Trang mở link mời vào nhóm (/g/{token}), cùng khung với trang mời vào hộp thư.
export default function GroupInviteIndex() {
    const { status, token, group, openUrl, auth, flash } = usePage<GroupInvitePageProps>().props;
    const [isJoining, setJoining] = useState(false);

    useEffect(() => {
        if (flash.alert) useAlert(flash.alert);
    }, [flash.alert]);

    const join = () => {
        if (isJoining) return;
        setJoining(true);
        router.post(`/g/${token}`, {}, { onFinish: () => setJoining(false) });
    };

    // Trang đăng nhập/đăng ký và hộp thư dùng bộ CSS khác trang này: tải lại trọn trang.
    const goTo = (url: string) => window.location.assign(url);

    const errorKey = status === 'active' ? null : ERROR_STATUS_KEYS[status];

    return (
        <AuthShell>
            <Head>
                <title>{group ? t('CHAT.GROUP.INVITE_PAGE.TITLE', { name: group.name }) : t('CHAT.GROUP.INVITE_LINK')}</title>
                <meta name="robots" content="noindex, follow" />
            </Head>
            <div className={authCard}>
                <div className="flex flex-col items-center text-center gap-1 mb-6">
                    <BrandMark className="h-7" />
                </div>

                {group ? (
                    <div className="flex flex-col items-center text-center gap-2 w-full">
                        <Avatar
                            seed={conversationAvatarSeed(group, null)}
                            stack={conversationAvatarStack(group)}
                            name={group.name}
                            size={GROUP_AVATAR_SIZE_PX}
                            roundedFull
                            className="mb-2"
                        />
                        <p className="m-0 text-sm text-n-slate-11">
                            {group.inviter
                                ? t('CHAT.GROUP.INVITE_PAGE.INVITED_BY', { name: group.inviter })
                                : t('CHAT.GROUP.INVITE_PAGE.INVITED')}
                        </p>
                        <h1 className="m-0 text-2xl font-semibold text-n-slate-12">{group.name}</h1>
                        <p className="m-0 text-sm text-n-slate-11">{t('CHAT.GROUP.MEMBERS', { count: group.member_count })}</p>

                        <div className="flex flex-col gap-3 w-full mt-5">
                            {openUrl ? (
                                <>
                                    <p className="m-0 text-sm text-n-slate-11">{t('CHAT.GROUP.INVITE_PAGE.ALREADY_MEMBER')}</p>
                                    <NextButton lg type="button" className="w-full font-medium" label={t('CHAT.GROUP.INVITE_PAGE.OPEN')} onClick={() => goTo(openUrl)} />
                                </>
                            ) : auth.user ? (
                                <NextButton lg type="button" className="w-full font-medium" label={t('CHAT.GROUP.INVITE_PAGE.JOIN')} isLoading={isJoining} onClick={join} />
                            ) : (
                                <>
                                    <NextButton lg type="button" className="w-full font-medium" label={t('CHAT.GROUP.INVITE_PAGE.SIGNUP')} onClick={() => goTo('/app/auth/signup')} />
                                    <NextButton lg faded slate type="button" className="w-full" label={t('CHAT.GROUP.INVITE_PAGE.LOGIN')} onClick={() => goTo('/app/login')} />
                                </>
                            )}
                            <p className="m-0 text-xs text-n-slate-11">{t('CHAT.GROUP.INVITE_PAGE.HISTORY_HINT')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center gap-3">
                        <h1 className="m-0 text-2xl font-semibold text-n-slate-12">{t(`CHAT.GROUP.INVITE_PAGE.ERRORS.${errorKey ?? 'NOT_FOUND'}.TITLE`)}</h1>
                        <p className="m-0 text-sm text-n-slate-11 max-w-sm">{t(`CHAT.GROUP.INVITE_PAGE.ERRORS.${errorKey ?? 'NOT_FOUND'}.DESC`)}</p>
                        <a href="/" className="flex items-center gap-1.5 mt-4 py-3 -my-3 text-sm font-medium w-fit text-n-slate-11 hover:text-n-slate-12">
                            <span className="i-lucide-arrow-left size-4" aria-hidden="true" />
                            {t('CHAT.GROUP.INVITE_PAGE.BACK_HOME')}
                        </a>
                    </div>
                )}
            </div>
        </AuthShell>
    );
}
