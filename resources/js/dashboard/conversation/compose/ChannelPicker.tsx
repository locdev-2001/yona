import type { ReactNode } from 'react';

import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import LoaderIcon from 'shared/components/loader/LoaderIcon';
import { t } from '../../../i18n';
import { unavailableReasonKey } from './composeDraft';
import type { ChannelOption } from './composeDraft';

interface ChannelPickerProps {
    options: ChannelOption[];
    isLoading: boolean;
    loadFailed: boolean;
    hasRecipient: boolean;
    selectedInboxId: number | null;
    hasError: boolean;
    onSelect: (option: ChannelOption) => void;
    onRetry: () => void;
}

// "Gửi qua": mỗi hộp thư một thẻ — logo nền tảng, tên hộp, địa chỉ của khách ở
// kênh đó. Chọn đúng một kênh; thẻ không gửi được thì mờ và nói rõ lý do.
export default function ChannelPicker({
    options,
    isLoading,
    loadFailed,
    hasRecipient,
    selectedInboxId,
    hasError,
    onSelect,
    onRetry,
}: ChannelPickerProps) {
    if (!hasRecipient) {
        return <Hint>{t('COMPOSE_NEW_CONVERSATION.FORM.INBOX_SELECTOR.PICK_CONTACT_FIRST')}</Hint>;
    }
    if (isLoading) {
        return (
            <Hint>
                <LoaderIcon size={16} className="text-n-slate-11" />
                {t('COMPOSE_NEW_CONVERSATION.DRAFT.LOADING_CHANNELS')}
            </Hint>
        );
    }
    if (loadFailed) {
        return (
            <Hint tone="error">
                {t('COMPOSE_NEW_CONVERSATION.DRAFT.LOAD_CHANNELS_FAILED')}
                <button type="button" className="underline text-n-slate-12" onClick={onRetry}>
                    {t('COMPOSE_NEW_CONVERSATION.DRAFT.RETRY')}
                </button>
            </Hint>
        );
    }
    if (options.length === 0) {
        return <Hint tone="error">{t('COMPOSE_NEW_CONVERSATION.FORM.NO_INBOX_ALERT')}</Hint>;
    }

    return (
        <div
            role="radiogroup"
            aria-label={t('COMPOSE_NEW_CONVERSATION.FORM.INBOX_SELECTOR.LABEL')}
            className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2 flex-1 min-w-0 max-h-56 overflow-y-auto p-0.5"
        >
            {options.map(option => (
                <ChannelCard
                    key={option.inbox.id}
                    option={option}
                    isSelected={option.inbox.id === selectedInboxId}
                    hasError={hasError && selectedInboxId === null}
                    onSelect={() => onSelect(option)}
                />
            ))}
        </div>
    );
}

function ChannelCard({
    option,
    isSelected,
    hasError,
    onSelect,
}: {
    option: ChannelOption;
    isSelected: boolean;
    hasError: boolean;
    onSelect: () => void;
}) {
    const { inbox, source_id: address, available, reason } = option;
    const platformName = inbox.platform?.name;
    const outline = isSelected
        ? 'outline-2 outline-n-brand bg-n-brand/5'
        : hasError && available
          ? 'outline-1 outline-n-ruby-9'
          : 'outline-1 outline-n-weak';

    return (
        <button
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={!available}
            disabled={!available}
            onClick={onSelect}
            className={`flex items-start gap-3 min-w-0 p-3 rounded-xl text-start outline -outline-offset-1 transition-colors ${outline} ${
                available ? 'hover:bg-n-alpha-2 cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}
        >
            <ChannelIcon inbox={inbox} className="size-8 shrink-0" />
            <span className="flex flex-col min-w-0 flex-1 gap-0.5">
                <span className="text-sm font-medium truncate text-n-slate-12">{inbox.name}</span>
                {platformName || address ? (
                    <span className="text-xs truncate text-n-slate-11">
                        {[platformName, address].filter(Boolean).join(' · ')}
                    </span>
                ) : null}
                {!available ? (
                    <span className="text-xs text-n-amber-11">{t(unavailableReasonKey(reason))}</span>
                ) : null}
            </span>
            {isSelected ? <span className="i-lucide-circle-check size-5 shrink-0 text-n-brand" aria-hidden="true" /> : null}
        </button>
    );
}

function Hint({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
    return (
        <span className={`flex items-center gap-1.5 min-h-8 text-sm ${tone === 'error' ? 'text-n-ruby-11' : 'text-n-slate-10'}`}>
            {children}
        </span>
    );
}
