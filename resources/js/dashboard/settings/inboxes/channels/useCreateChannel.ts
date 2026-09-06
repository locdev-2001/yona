import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// `inboxes/createChannel` + `router.replace({name:'settings_inboxes_add_agents'})`
// của mọi form kênh — một nguồn duy nhất cho việc tạo inbox rồi sang bước gán agent.
export function useCreateChannel(fallbackErrorMessage: string) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const [isCreating, setCreating] = useState(false);

    const createChannel = async (payload: Record<string, unknown>) => {
        setCreating(true);

        try {
            const inbox = await postJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes`, payload);
            window.location.replace(accountScopedUrl(accountId, `settings/inboxes/new/${inbox.id}/agents`));
        } catch (error) {
            setCreating(false);
            useAlert(parseApiErrorMessage(error) || fallbackErrorMessage);
        }
    };

    return { accountId, isCreating, createChannel };
}
