import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchContactableInboxes } from './composeApi';
import { optionsForNewRecipient } from './composeDraft';
import type { ChannelOption, ComposeInbox, ComposeRecipient } from './composeDraft';

const NO_OPTIONS: ChannelOption[] = [];

interface ChannelOptionsState {
    options: ChannelOption[];
    isLoading: boolean;
    loadFailed: boolean;
    reload: () => void;
}

// Kênh gửi được tới người nhận: liên hệ có sẵn thì hỏi máy chủ (biết lịch sử,
// cửa sổ nhắn tin, địa chỉ ở từng kênh); địa chỉ mới thì lọc tại chỗ theo năng lực.
export function useChannelOptions(
    accountId: number,
    recipient: ComposeRecipient | null,
    inboxes: readonly ComposeInbox[],
): ChannelOptionsState {
    const contactId = recipient?.kind === 'contact' ? recipient.contact.id : null;
    const [fetched, setFetched] = useState<{ contactId: number; options: ChannelOption[] } | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setLoadFailed(false);
        if (contactId === null) return undefined;

        let cancelled = false;
        fetchContactableInboxes(accountId, contactId).then(
            options => {
                if (!cancelled) setFetched({ contactId, options });
            },
            () => {
                if (!cancelled) setLoadFailed(true);
            },
        );
        return () => {
            cancelled = true;
        };
    }, [accountId, contactId, attempt]);

    const newRecipientOptions = useMemo(
        () => (recipient?.kind === 'new' ? optionsForNewRecipient(inboxes, recipient) : NO_OPTIONS),
        [recipient, inboxes],
    );
    const reload = useCallback(() => setAttempt(current => current + 1), []);

    if (recipient?.kind === 'new') {
        return { options: newRecipientOptions, isLoading: false, loadFailed: false, reload };
    }
    if (contactId === null) return { options: NO_OPTIONS, isLoading: false, loadFailed: false, reload };

    const isCurrent = fetched?.contactId === contactId;
    return {
        options: isCurrent ? fetched.options : NO_OPTIONS,
        isLoading: !isCurrent && !loadFailed,
        loadFailed,
        reload,
    };
}
