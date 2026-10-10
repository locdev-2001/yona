import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { useFacebookPageConnect } from 'dashboard/composables/useFacebookPageConnect';
import type { FacebookPageDetail } from 'dashboard/composables/useFacebookPageConnect';
import { ScriptLoaderError } from 'dashboard/helper/facebookSdk';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { useBranding } from 'shared/composables/useBranding';
import Button from 'dashboard/components-next/button/Button';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import LoadingState from 'dashboard/components/widgets/LoadingState';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import type { Inbox } from '../types';

const FACEBOOK_LOGO_URL = '/brand-assets/platforms/facebook.webp';

// Port từ settings/inbox/channels/Facebook.vue — đăng nhập Meta bằng SDK rồi
// chọn trang để tạo inbox. Banner giới hạn tạo inbox Meta chỉ có trên bản cloud
// Cloud nên không port.
export default function FacebookChannelForm() {
    const { replaceInstallationName } = useBranding();
    const { accountId, preloadSdk, loginAndFetchPages } = useFacebookPageConnect();

    const [hasLoginStarted, setLoginStarted] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorStateMessage, setErrorStateMessage] = useState('');
    const [userAccessToken, setUserAccessToken] = useState('');
    const [pageList, setPageList] = useState<FacebookPageDetail[]>([]);
    const [selectedPageId, setSelectedPageId] = useState('');
    const [pageName, setPageName] = useState('');
    const [touched, setTouched] = useState(false);
    const [isCreating, setCreating] = useState(false);
    const [emptyStateMessage, setEmptyStateMessage] = useState(t('INBOX_MGMT.DETAILS.LOADING_FB'));

    // Hâm nóng SDK để popup FB.login mở trong cửa sổ hoạt động của cú nhấp.
    useEffect(() => {
        void preloadSdk().catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectablePages = pageList.filter(page => !page.exists);
    const comboBoxPageOptions = selectablePages.map(({ id, name }) => ({ value: id, label: name }));
    const selectedPage = pageList.find(page => page.id === selectedPageId) ?? null;
    const showLoader = !userAccessToken || isCreating;

    const startLogin = async () => {
        setLoginStarted(true);
        try {
            const result = await loginAndFetchPages();

            if (!result) {
                setHasError(true);
                setErrorStateMessage(t('INBOX_MGMT.DETAILS.ERROR_FB_AUTH'));

                return;
            }

            setPageList(result.pages);
            setUserAccessToken(result.userAccessToken);
        } catch (error) {
            useAlert(
                error instanceof ScriptLoaderError
                    ? t('INBOX_MGMT.DETAILS.ERROR_FB_LOADING')
                    : t('INBOX_MGMT.DETAILS.ERROR_FB_AUTH'),
            );
        }
    };

    const setPageNameFromSelection = (pageId: string) => {
        const page = pageList.find(item => item.id === pageId);
        setSelectedPageId(page ? page.id : '');
        setPageName(page ? page.name : '');
        setTouched(true);
    };

    const createChannel = async (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (!selectedPage || !pageName) return;

        setEmptyStateMessage(t('INBOX_MGMT.DETAILS.CREATING_CHANNEL'));
        setCreating(true);

        try {
            const response = await postJson<{ data: Inbox }>(
                `/api/v1/accounts/${accountId}/callbacks/register_facebook_page`,
                {
                    user_access_token: userAccessToken,
                    page_access_token: selectedPage.access_token,
                    page_id: selectedPage.id,
                    inbox_name: selectedPage.name.trim(),
                },
            );
            window.location.replace(
                accountScopedUrl(accountId, `settings/inboxes/new/${response.data.id}/agents`),
            );
        } catch (error) {
            setCreating(false);
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.DETAILS.ERROR_CHANNEL_CREATION'));
        }
    };

    if (!hasLoginStarted) {
        return (
            <div className="h-full p-6 w-full max-w-full flex-shrink-0 flex-grow-0">
                <div className="flex flex-col items-center justify-center w-full px-8 py-10 text-center rounded-2xl panel-surface">
                    <div className="flex flex-col items-center w-full max-w-2xl">
                        <h6 className="text-2xl font-medium">{t('INBOX_MGMT.ADD.FB.CONNECT_YOUR_FACEBOOK_PAGE')}</h6>
                        <p className="py-6 text-sm text-balance text-n-slate-11">
                            {replaceInstallationName(t('INBOX_MGMT.ADD.FB.HELP'))}
                        </p>
                        <Button
                            className="!rounded-full !px-6"
                            slate
                            outline
                            lg
                            icon={<img src={FACEBOOK_LOGO_URL} alt="" className="size-5" />}
                            label={t('INBOX_MGMT.ADD.FB.CONTINUE_WITH_FACEBOOK')}
                            onClick={() => void startLogin()}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full col-span-6 p-6 overflow-auto">
            <div>
                {hasError ? (
                    <div className="max-w-lg mx-auto text-center">
                        <h5>{errorStateMessage}</h5>
                    </div>
                ) : showLoader ? (
                    <LoadingState message={emptyStateMessage} />
                ) : (
                    <form className="flex flex-col flex-wrap mx-0" onSubmit={event => void createChannel(event)}>
                        <div className="w-full">
                            <SettingsSubPageHeader
                                headerTitle={t('INBOX_MGMT.ADD.DETAILS.TITLE')}
                                headerContent={replaceInstallationName(t('INBOX_MGMT.ADD.DETAILS.DESC'))}
                            />
                        </div>
                        <div className="w-3/5">
                            <div className="w-full mb-2">
                                <div className={`input-wrap ${touched && !selectedPage ? 'error' : ''}`}>
                                    <span className="text-n-slate-12 text-start">
                                        {t('INBOX_MGMT.ADD.FB.CHOOSE_PAGE')}
                                    </span>
                                    <ComboBox
                                        value={selectedPageId}
                                        options={comboBoxPageOptions}
                                        placeholder={t('INBOX_MGMT.ADD.FB.PICK_A_VALUE')}
                                        hasError={touched && !selectedPage}
                                        className="[&>div>button]:!bg-n-alpha-black2 mt-1"
                                        onChange={setPageNameFromSelection}
                                    />
                                    {touched && !selectedPage ? (
                                        <span className="message mt-0.5">
                                            {t('INBOX_MGMT.ADD.FB.CHOOSE_PLACEHOLDER')}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="w-full">
                                <label className={touched && !pageName ? 'error' : ''}>
                                    {t('INBOX_MGMT.ADD.FB.INBOX_NAME')}
                                    <input
                                        type="text"
                                        value={pageName}
                                        placeholder={t('INBOX_MGMT.ADD.FB.PICK_NAME')}
                                        onChange={event => {
                                            setPageName(event.target.value);
                                            setTouched(true);
                                        }}
                                    />
                                    {touched && !pageName ? (
                                        <span className="message">{t('INBOX_MGMT.ADD.FB.ADD_NAME')}</span>
                                    ) : null}
                                </label>
                            </div>
                            <div className="w-full text-right">
                                <Button type="submit" label={t('INBOX_MGMT.ADD.FB.CREATE_INBOX')} />
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
