import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Dashboard from '../Dashboard';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import CampaignLayout from 'dashboard/components-next/Campaigns/CampaignLayout';
import CampaignList from 'dashboard/components-next/Campaigns/Pages/CampaignPage/CampaignList';
import ConfirmDeleteCampaignDialog from 'dashboard/components-next/Campaigns/Pages/CampaignPage/ConfirmDeleteCampaignDialog';
import EditLiveChatCampaignDialog from 'dashboard/components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/EditLiveChatCampaignDialog';
import LiveChatCampaignDialog from 'dashboard/components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/LiveChatCampaignDialog';
import LiveChatCampaignEmptyState from 'dashboard/components-next/Campaigns/EmptyState/LiveChatCampaignEmptyState';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson, parseApiErrorMessage, patchJson, postJson } from 'dashboard/helper/apiClient';

import { t } from '../../i18n';
import type { Campaign, LiveChatCampaignPayload } from 'dashboard/components-next/Campaigns/types';
import type { DashboardPageProps } from '../types';

// Port từ routes/dashboard/campaigns/pages/LiveChatCampaignsPage.vue
// (+ CampaignsPageRouteView.vue: tải danh sách khi vào màn).
// Store vuex `campaigns` thay bằng fetch tại màn, cùng lối settings/labels.
export default function LiveChatCampaignsPage() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [isCreating, setCreating] = useState(false);
    const [isUpdating, setUpdating] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    const editDialogRef = useRef<DialogHandle>(null);
    const deleteDialogRef = useRef<DialogHandle>(null);

    const campaignsUrl = `/api/v1/accounts/${accountId}/campaigns`;

    const fetchCampaigns = useCallback(async () => {
        try {
            setCampaigns(await getJson<Campaign[]>(campaignsUrl));
        } finally {
            setFetching(false);
        }
    }, [campaignsUrl]);

    useEffect(() => {
        void fetchCampaigns();
    }, [fetchCampaigns]);

    // Chỉ tab Live chat: campaign ongoing của inbox Website.
    const liveChatCampaigns = campaigns.filter(campaign => campaign.campaign_type === 'ongoing');
    const hasNoLiveChatCampaigns = liveChatCampaigns.length === 0 && !isFetching;

    const addCampaign = async (payload: LiveChatCampaignPayload) => {
        setCreating(true);
        try {
            await postJson(campaignsUrl, payload as unknown as Record<string, unknown>);
            await fetchCampaigns();
            useAlert(t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) ?? t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.API.ERROR_MESSAGE'));
        } finally {
            setCreating(false);
        }
    };

    const updateCampaign = async (payload: LiveChatCampaignPayload) => {
        if (!selectedCampaign) return;

        setUpdating(true);
        try {
            await patchJson(
                `${campaignsUrl}/${selectedCampaign.id}`,
                payload as unknown as Record<string, unknown>,
            );
            await fetchCampaigns();
            useAlert(t('CAMPAIGN.LIVE_CHAT.EDIT.FORM.API.SUCCESS_MESSAGE'));
            editDialogRef.current?.close();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) ?? t('CAMPAIGN.LIVE_CHAT.EDIT.FORM.API.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    const deleteCampaign = async () => {
        if (!selectedCampaign) return;

        try {
            await deleteJson(`${campaignsUrl}/${selectedCampaign.id}`);
            await fetchCampaigns();
            useAlert(t('CAMPAIGN.CONFIRM_DELETE.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('CAMPAIGN.CONFIRM_DELETE.API.ERROR_MESSAGE'));
        } finally {
            deleteDialogRef.current?.close();
        }
    };

    return (
        <Dashboard>
            <div className="flex flex-col justify-between flex-1 h-full m-0 overflow-auto bg-n-surface-1">
                <CampaignLayout
                    headerTitle={t('CAMPAIGN.LIVE_CHAT.HEADER_TITLE')}
                    buttonLabel={t('CAMPAIGN.LIVE_CHAT.NEW_CAMPAIGN')}
                    onClick={() => setShowCreateDialog(open => !open)}
                    onClose={() => setShowCreateDialog(false)}
                    action={
                        showCreateDialog ? (
                            <LiveChatCampaignDialog
                                isCreating={isCreating}
                                onSubmit={payload => void addCampaign(payload)}
                                onClose={() => setShowCreateDialog(false)}
                            />
                        ) : null
                    }
                >
                    {isFetching ? (
                        <div className="flex justify-center items-center py-10 text-n-slate-11">
                            <Spinner />
                        </div>
                    ) : hasNoLiveChatCampaigns ? (
                        <LiveChatCampaignEmptyState
                            title={t('CAMPAIGN.LIVE_CHAT.EMPTY_STATE.TITLE')}
                            subtitle={t('CAMPAIGN.LIVE_CHAT.EMPTY_STATE.SUBTITLE')}
                            className="pt-14"
                        />
                    ) : (
                        <CampaignList
                            campaigns={liveChatCampaigns}
                            onEdit={campaign => {
                                setSelectedCampaign(campaign);
                                editDialogRef.current?.open();
                            }}
                            onDelete={campaign => {
                                setSelectedCampaign(campaign);
                                deleteDialogRef.current?.open();
                            }}
                        />
                    )}

                    <EditLiveChatCampaignDialog
                        ref={editDialogRef}
                        selectedCampaign={selectedCampaign}
                        isUpdating={isUpdating}
                        onSubmit={payload => void updateCampaign(payload)}
                    />
                    <ConfirmDeleteCampaignDialog ref={deleteDialogRef} onConfirm={() => void deleteCampaign()} />
                </CampaignLayout>
            </div>
        </Dashboard>
    );
}
