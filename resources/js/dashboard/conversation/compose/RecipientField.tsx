import { useEffect, useId, useRef, useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import LoaderIcon from 'shared/components/loader/LoaderIcon';
import { getJson } from 'dashboard/helper/apiClient';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../../i18n';
import type { ContactMeta } from '../types';
import { contactHasAddress, detectNewRecipient, emailReasonKey, recipientLabel } from './composeDraft';
import type { ComposeRecipient, EmailCheck } from './composeDraft';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

interface RecipientFieldProps {
    accountId: number;
    recipient: ComposeRecipient | null;
    emailCheck: EmailCheck;
    hasError: boolean;
    // Đang gửi: tin đã chụp người nhận này, không cho đổi giữa chừng.
    disabled?: boolean;
    onSelect: (recipient: ComposeRecipient | null) => void;
}

type Suggestion = { key: string; recipient: ComposeRecipient };

type SearchOutcome = { query: string; contacts: ContactMeta[]; failed: boolean };

// Ô "Đến": tìm liên hệ theo tên/email/SĐT; chuỗi là email/SĐT mà chưa có liên hệ
// thì mời tạo liên hệ mới (tạo khi gửi). Email mới hiện ngay kết quả kiểm địa chỉ.
export default function RecipientField({
    accountId,
    recipient,
    emailCheck,
    hasError,
    disabled = false,
    onSelect,
}: RecipientFieldProps) {
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState<SearchOutcome | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    // Danh sách gợi ý đóng khi rời ô hoặc bấm Esc; gõ tiếp là mở lại.
    const [isDismissed, setIsDismissed] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();
    const optionId = (index: number) => `${listboxId}-option-${index}`;

    const trimmedQuery = query.trim();
    useEffect(() => {
        if (trimmedQuery.length < MIN_QUERY_LENGTH) {
            setSearch(null);
            return undefined;
        }
        let cancelled = false;
        const timer = window.setTimeout(() => {
            getJson<{ payload: ContactMeta[] }>(
                `/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(trimmedQuery)}`,
            ).then(
                response => {
                    if (cancelled) return;
                    setSearch({ query: trimmedQuery, contacts: response.payload ?? [], failed: false });
                    setActiveIndex(0);
                },
                () => {
                    if (!cancelled) setSearch({ query: trimmedQuery, contacts: [], failed: true });
                },
            );
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [accountId, trimmedQuery]);

    const currentSearch = search?.query === trimmedQuery ? search : null;
    const results = currentSearch?.contacts ?? [];
    const newRecipient = detectNewRecipient(trimmedQuery);
    // Tìm kiếm lỗi thì không biết địa chỉ đã có liên hệ chưa — không mời tạo mới để khỏi tạo trùng.
    const canOfferNewContact =
        newRecipient !== null &&
        currentSearch !== null &&
        !currentSearch.failed &&
        !results.some(contact => contactHasAddress(contact, newRecipient));
    const suggestions: Suggestion[] = [
        ...results.map(contact => ({ key: `contact-${contact.id}`, recipient: { kind: 'contact', contact } as ComposeRecipient })),
        ...(canOfferNewContact ? [{ key: 'new', recipient: newRecipient }] : []),
    ];
    const isOpen = currentSearch !== null && !isDismissed;
    const activeOption = isOpen && suggestions.length > 0 ? Math.min(activeIndex, suggestions.length - 1) : null;

    const pick = (picked: ComposeRecipient) => {
        onSelect(picked);
        setQuery('');
        setSearch(null);
    };

    if (recipient) {
        const { name, secondary } = recipientLabel(recipient);
        return (
            <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 self-start max-w-full rounded-lg bg-n-alpha-2 min-h-8 py-1 ps-1.5 pe-1">
                    {recipient.kind === 'contact' ? (
                        <Avatar
                            name={name}
                            seed={avatarSeed('contact', recipient.contact.id)}
                            src={recipient.contact.thumbnail}
                            size={20}
                        />
                    ) : (
                        <span className="i-lucide-user-plus size-4 shrink-0 text-n-slate-11" aria-hidden="true" />
                    )}
                    <span className="text-sm truncate text-n-slate-12">{name}</span>
                    {secondary ? <span className="text-sm truncate text-n-slate-11">{secondary}</span> : null}
                    {recipient.kind === 'new' ? (
                        <span className="shrink-0 text-xs rounded px-1.5 py-0.5 bg-n-brand/10 text-n-brand">
                            {t('COMPOSE_NEW_CONVERSATION.DRAFT.NEW_CONTACT_BADGE')}
                        </span>
                    ) : null}
                    <Button
                        variant="ghost"
                        icon="i-lucide-x"
                        color="slate"
                        size="xs"
                        className="shrink-0"
                        disabled={disabled}
                        title={t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.CHANGE')}
                        aria-label={t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.CHANGE')}
                        onClick={() => {
                            onSelect(null);
                            window.setTimeout(() => inputRef.current?.focus());
                        }}
                    />
                </div>
                <EmailCheckNote emailCheck={emailCheck} />
            </div>
        );
    }

    return (
        <div className="relative flex-1 min-w-0">
            <input
                ref={inputRef}
                autoFocus
                value={query}
                disabled={disabled}
                role="combobox"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-activedescendant={activeOption === null ? undefined : optionId(activeOption)}
                aria-label={t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.LABEL')}
                onChange={event => {
                    setQuery(event.target.value);
                    setIsDismissed(false);
                }}
                onFocus={() => setIsDismissed(false)}
                onBlur={() => setIsDismissed(true)}
                onKeyDown={event => {
                    if (event.key === 'Escape' && isOpen) {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsDismissed(true);
                        return;
                    }
                    if (event.key === 'ArrowDown' && isDismissed && currentSearch) {
                        event.preventDefault();
                        setIsDismissed(false);
                        return;
                    }
                    if (activeOption === null) return;
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        const step = event.key === 'ArrowDown' ? 1 : -1;
                        setActiveIndex((activeOption + step + suggestions.length) % suggestions.length);
                    } else if (event.key === 'Enter') {
                        event.preventDefault();
                        pick(suggestions[activeOption].recipient);
                    }
                }}
                placeholder={t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.TAG_INPUT_PLACEHOLDER')}
                className={`reset-base w-full h-8 m-0 p-0 text-sm bg-transparent border-0 shadow-none outline-none text-n-slate-12 placeholder:text-n-slate-10 ${
                    hasError ? 'placeholder:!text-n-ruby-9' : ''
                }`}
            />
            {isOpen ? (
                <ul
                    id={listboxId}
                    role="listbox"
                    aria-label={t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.LABEL')}
                    // Giữ focus ở ô nhập khi bấm chọn, để blur không đóng danh sách trước khi click chạy.
                    onMouseDown={event => event.preventDefault()}
                    className="absolute z-[100] top-9 inset-x-0 max-w-md max-h-64 overflow-y-auto overlay-surface rounded-lg py-1"
                >
                    {currentSearch?.failed && suggestions.length === 0 ? (
                        <li role="alert" className="px-3 py-2 text-sm text-n-ruby-11">
                            {t('COMPOSE_NEW_CONVERSATION.CONTACT_SEARCH.ERROR_MESSAGE')}
                        </li>
                    ) : suggestions.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-n-slate-11">
                            {t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.NO_RESULTS')}
                        </li>
                    ) : (
                        suggestions.map((suggestion, index) => (
                            <SuggestionRow
                                key={suggestion.key}
                                id={optionId(index)}
                                recipient={suggestion.recipient}
                                isActive={index === activeOption}
                                onPick={() => pick(suggestion.recipient)}
                            />
                        ))
                    )}
                </ul>
            ) : null}
        </div>
    );
}

function SuggestionRow({
    id,
    recipient,
    isActive,
    onPick,
}: {
    id: string;
    recipient: ComposeRecipient;
    isActive: boolean;
    onPick: () => void;
}) {
    const rowClass = `flex items-center gap-2.5 w-full px-3 py-1.5 text-start cursor-pointer ${
        isActive ? 'bg-n-alpha-2' : 'hover:bg-n-alpha-2'
    }`;

    if (recipient.kind === 'new') {
        return (
            <li id={id} role="option" aria-selected={isActive} className={rowClass} onClick={onPick}>
                <span className="i-lucide-user-plus size-5 shrink-0 text-n-brand" aria-hidden="true" />
                <span className="text-sm truncate text-n-slate-12">
                    {t('COMPOSE_NEW_CONVERSATION.DRAFT.CREATE_CONTACT', { address: recipient.address })}
                </span>
            </li>
        );
    }

    const { name, secondary } = recipientLabel(recipient);
    return (
        <li id={id} role="option" aria-selected={isActive} className={rowClass} onClick={onPick}>
            <Avatar name={name} seed={avatarSeed('contact', recipient.contact.id)} src={recipient.contact.thumbnail} size={24} />
            <span className="flex flex-col min-w-0">
                <span className="text-sm truncate text-n-slate-12">{name}</span>
                {secondary ? <span className="text-xs truncate text-n-slate-11">{secondary}</span> : null}
            </span>
        </li>
    );
}

function EmailCheckNote({ emailCheck }: { emailCheck: EmailCheck }) {
    if (emailCheck.status === 'checking') {
        return (
            <span className="flex items-center gap-1.5 text-xs text-n-slate-11">
                <LoaderIcon size={16} className="text-n-slate-11" />
                {t('COMPOSE_NEW_CONVERSATION.DRAFT.EMAIL_CHECK.CHECKING')}
            </span>
        );
    }
    if (emailCheck.status === 'undeliverable') {
        return (
            <span role="alert" className="flex items-start gap-1.5 text-xs text-n-ruby-11">
                <span className="i-lucide-circle-alert size-3.5 shrink-0 mt-px" aria-hidden="true" />
                {t(emailReasonKey(emailCheck.reason))}
            </span>
        );
    }
    return null;
}
