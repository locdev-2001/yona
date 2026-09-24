import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { router } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import Input from 'dashboard/components-next/input/Input';
import MessagePreview from 'dashboard/components/widgets/conversation/MessagePreview';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { conversationUrl } from 'dashboard/helper/URLHelper';

import { t } from '../../../i18n';
import { forwardMessage } from '../forwardApi';
import type { ForwardTarget } from '../forwardApi';
import type { ConversationMessage } from '../types';
import { summarizeForwardResults } from './forwardResultSummary';
import { useForwardTargets } from './useForwardTargets';

// Hộp chọn hội thoại đích để chuyển tiếp một tin. Luật "đích nào nhận được" là
// của máy chủ: dòng không nhận được hiện mờ kèm lý do, FE không tự suy.

interface ForwardMessageDialogProps {
    accountId: number;
    conversationId: number;
    message: ConversationMessage;
    onClose: () => void;
}

const SKELETON_ROWS = 3;

function targetName(target: ForwardTarget): string {
    return target.contact.name || target.contact.phone_number || `#${target.id}`;
}

export default function ForwardMessageDialog({ accountId, conversationId, message, onClose }: ForwardMessageDialogProps) {
    const dialogRef = useRef<DialogHandle>(null);
    const [query, setQuery] = useState('');
    // Giữ lựa chọn khi đổi từ khoá: dòng đã chọn có thể không còn trong kết quả mới.
    const [selected, setSelected] = useState<ReadonlyMap<number, ForwardTarget>>(new Map());
    const [isSubmitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const { targets, maxTargets, status, error, reload } = useForwardTargets({
        accountId,
        conversationId,
        messageId: message.id,
        query,
    });

    useEffect(() => {
        dialogRef.current?.open();
    }, []);

    const isBlocked = status === 'blocked';
    const isFull = selected.size >= maxTargets;

    const toggleTarget = (target: ForwardTarget) => {
        setSubmitError(null);
        setSelected(current => {
            const next = new Map(current);
            if (next.has(target.id)) {
                next.delete(target.id);
            } else if (target.forwardable && next.size < maxTargets) {
                next.set(target.id, target);
            }
            return next;
        });
    };

    // Dialog sở hữu <form>: Enter trong ô tìm sẽ gửi chuyển tiếp nhầm.
    const preventSubmitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') event.preventDefault();
    };

    const submit = async () => {
        if (selected.size === 0 || isSubmitting) return;

        setSubmitting(true);
        setSubmitError(null);
        try {
            const summary = summarizeForwardResults(
                await forwardMessage(accountId, conversationId, message.id, [...selected.keys()]),
            );

            if (summary.kind === 'failed') {
                setSubmitError(t('CONVERSATION.FORWARD.FAILED', { error: summary.firstError ?? '' }).trim());
                return;
            }

            if (summary.kind === 'success') {
                const openTargetId = summary.singleTargetId;
                useAlert(
                    t('CONVERSATION.FORWARD.SUCCESS', { count: summary.okCount }),
                    openTargetId === null
                        ? undefined
                        : {
                              message: t('CONVERSATION.FORWARD.OPEN'),
                              onClick: () => router.visit(conversationUrl({ accountId, id: openTargetId })),
                          },
                );
            } else {
                useAlert(
                    t('CONVERSATION.FORWARD.PARTIAL', {
                        ok: summary.okCount,
                        total: summary.total,
                        error: summary.firstError ?? '',
                    }).trim(),
                );
            }
            dialogRef.current?.close();
        } catch (reason) {
            setSubmitError(t('CONVERSATION.FORWARD.FAILED', { error: parseApiErrorMessage(reason) ?? '' }).trim());
        } finally {
            setSubmitting(false);
        }
    };

    const renderTargets = () => {
        if (status === 'error') {
            return (
                <div className="flex flex-col items-center gap-2 py-6 text-sm text-center text-n-slate-11">
                    <p className="mb-0">{t('CONVERSATION.FORWARD.LOAD_FAILED')}</p>
                    <Button type="button" size="sm" variant="faded" color="slate" label={t('CONVERSATION.FORWARD.RETRY')} onClick={reload} />
                </div>
            );
        }

        if (status === 'loading' && targets.length === 0) {
            return (
                <ul aria-busy="true" className="flex flex-col gap-1">
                    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                        <li key={index} className="h-12 rounded md:h-10 bg-n-alpha-1" />
                    ))}
                </ul>
            );
        }

        if (targets.length === 0) {
            return <p className="py-6 mb-0 text-sm text-center text-n-slate-11">{t('CONVERSATION.FORWARD.EMPTY')}</p>;
        }

        return (
            <ul data-testid="forward-targets" className="flex flex-col -mx-1 overflow-y-auto max-h-80">
                {targets.map(target => {
                    const isSelected = selected.has(target.id);
                    const isOverLimit = !isSelected && isFull;
                    const isDisabled = !target.forwardable || isOverLimit;
                    const name = targetName(target);

                    return (
                        <li key={target.id}>
                            <label
                                data-testid={`forward-target-${target.id}`}
                                title={isOverLimit ? t('CONVERSATION.FORWARD.MAX_REACHED', { max: maxTargets }) : undefined}
                                className={`flex items-center gap-3 px-1 py-1.5 min-h-12 md:min-h-10 rounded ${
                                    isDisabled && !isSelected ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-n-alpha-1'
                                }`}
                            >
                                <Checkbox
                                    checked={isSelected}
                                    disabled={isDisabled && !isSelected}
                                    onChange={() => toggleTarget(target)}
                                />
                                <Avatar name={name} src={target.contact.thumbnail ?? ''} size={28} />
                                <span className="flex flex-col flex-1 min-w-0">
                                    <span className="text-sm font-medium truncate text-n-slate-12">{name}</span>
                                    {target.forwardable ? (
                                        <span className="flex items-center min-w-0 gap-1 text-xs text-n-slate-11">
                                            <ChannelIcon inbox={target.inbox} className="size-3.5 shrink-0" />
                                            <span className="truncate">{target.inbox.name}</span>
                                            <span className="shrink-0">#{target.id}</span>
                                        </span>
                                    ) : (
                                        <span className="text-xs truncate text-n-ruby-11">{target.reason}</span>
                                    )}
                                </span>
                            </label>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <Dialog
            ref={dialogRef}
            width="lg"
            overflowYAuto
            title={t('CONVERSATION.FORWARD.TITLE')}
            confirmButtonLabel={t('CONVERSATION.FORWARD.SUBMIT_COUNT', { count: selected.size })}
            disableConfirmButton={selected.size === 0 || isSubmitting}
            isLoading={isSubmitting}
            showConfirmButton={!isBlocked}
            onConfirm={() => void submit()}
            onClose={onClose}
        >
            <div className="flex flex-col min-w-0 gap-3">
                <div data-testid="forward-preview" className="p-2 text-sm rounded bg-n-alpha-1 text-n-slate-12">
                    <MessagePreview message={message} showMessageType={false} />
                </div>
                {isBlocked ? (
                    <p role="alert" className="mb-0 text-sm text-n-ruby-11">
                        {error ?? t('CONVERSATION.FORWARD.LOAD_FAILED')}
                    </p>
                ) : (
                    <>
                        <Input
                            value={query}
                            type="search"
                            placeholder={t('CONVERSATION.FORWARD.SEARCH_PLACEHOLDER')}
                            aria-label={t('CONVERSATION.FORWARD.SEARCH_PLACEHOLDER')}
                            customInputClass="!ps-8"
                            onChange={event => setQuery(event.target.value)}
                            onKeyDown={preventSubmitOnEnter}
                            prefix={
                                <Icon
                                    icon="i-lucide-search"
                                    className="absolute z-10 -translate-y-1/2 size-4 text-n-slate-10 top-1/2 start-2.5"
                                />
                            }
                        />
                        {selected.size > 0 ? (
                            <ul data-testid="forward-selected" className="flex flex-wrap gap-1.5">
                                {[...selected.values()].map(target => {
                                    const name = targetName(target);

                                    return (
                                        <li
                                            key={target.id}
                                            className="flex items-center max-w-full gap-1 py-0.5 text-xs rounded-full ps-2 pe-0.5 bg-n-alpha-2 text-n-slate-12"
                                        >
                                            <span className="truncate max-w-40">{name}</span>
                                            <button
                                                type="button"
                                                aria-label={t('CONVERSATION.FORWARD.REMOVE_TARGET', { name })}
                                                className="grid rounded-full size-7 md:size-5 place-content-center hover:bg-n-alpha-3"
                                                onClick={() => toggleTarget(target)}
                                            >
                                                <Icon icon="i-lucide-x" className="size-3" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : null}
                        {query.trim() === '' ? (
                            <p className="mb-0 text-xs font-medium text-n-slate-11">{t('CONVERSATION.FORWARD.RECENT')}</p>
                        ) : null}
                        {renderTargets()}
                        {submitError ? (
                            <p role="alert" className="mb-0 text-sm text-n-ruby-11">
                                {submitError}
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </Dialog>
    );
}
