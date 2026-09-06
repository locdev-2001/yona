import { useRef } from 'react';
import { usePage } from '@inertiajs/react';

import { getJson } from 'dashboard/helper/apiClient';
import { buildFacebookLoginScopes, setupFacebookSdk } from 'dashboard/helper/facebookSdk';
import type { DashboardPageProps } from '../types';

export interface FacebookPageDetail {
    id: string;
    name: string;
    access_token: string;
    exists?: boolean;
}

// Port từ dashboard/composables/useFacebookPageConnect.js — nửa "không giao diện"
// của luồng nối trang Facebook: nạp SDK, chạy FB.login rồi lấy danh sách trang.
// Tách preloadSdk/loginAndFetchPages để popup mở trong cửa sổ hoạt động của cú
// nhấp (nạp nguội thì popup bị chặn).
export function useFacebookPageConnect() {
    const { currentAccount, globalConfig } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const sdkSetupPromise = useRef<Promise<void> | null>(null);
    const isAuthenticating = useRef(false);

    const preloadSdk = () => {
        if (!sdkSetupPromise.current) {
            sdkSetupPromise.current = setupFacebookSdk(
                globalConfig.fbAppId ?? '',
                globalConfig.fbApiVersion,
            ).catch(error => {
                sdkSetupPromise.current = null;
                throw error;
            });
        }

        return sdkSetupPromise.current;
    };

    // FB.login không bao giờ reject: trả token khi thành công, null cho mọi
    // trạng thái khác (đóng popup, not_authorized…).
    const login = (): Promise<string | null> =>
        new Promise(resolve => {
            window.FB.login(
                response =>
                    resolve(
                        response.status === 'connected' ? (response.authResponse?.accessToken ?? null) : null,
                    ),
                { scope: buildFacebookLoginScopes() },
            );
        });

    const loginAndFetchPages = async () => {
        if (isAuthenticating.current) return null;
        isAuthenticating.current = true;

        try {
            await preloadSdk();
            const token = await login();
            if (!token) return null;

            const response = await getJson<{ data: { page_details: FacebookPageDetail[] } }>(
                `/api/v1/accounts/${accountId}/callbacks/facebook_pages?omniauth_token=${encodeURIComponent(token)}`,
            );

            return { userAccessToken: token, pages: response.data.page_details };
        } finally {
            isAuthenticating.current = false;
        }
    };

    return { accountId, preloadSdk, loginAndFetchPages };
}
