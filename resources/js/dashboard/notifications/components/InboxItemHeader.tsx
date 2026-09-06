import { useEffect, useState } from 'react';
import { getUnixTime } from 'date-fns';

import Button from 'dashboard/components-next/button/Button';
import CustomSnoozeModal from 'dashboard/components/CustomSnoozeModal';
import Modal from 'dashboard/components/Modal';
import BackButton from 'dashboard/components/widgets/BackButton';
import { openCommandBar } from 'dashboard/commands/commandBarStore';
import { SNOOZE_OPTIONS } from 'dashboard/constants/globals';
import { CMD_SNOOZE_NOTIFICATION } from 'dashboard/helper/commandbar/events';
import { findSnoozeTime } from 'dashboard/helper/snoozeHelpers';
import { emitter } from 'shared/helpers/emitter';
import { t } from '../../../i18n';
import { useNotifications } from '../NotificationsContext';
import type { NotificationRecord } from '../types';
import PaginationButton from './PaginationButton';

// Port từ routes/dashboard/inbox/components/InboxItemHeader.vue.
interface InboxItemHeaderProps {
    totalLength: number;
    currentIndex: number;
    activeNotification: NotificationRecord | null;
    onPrev: () => void;
    onNext: () => void;
    onDeleted: () => void;
}

export default function InboxItemHeader({
    totalLength,
    currentIndex,
    activeNotification,
    onPrev,
    onNext,
    onDeleted,
}: InboxItemHeaderProps) {
    const { snooze, removeNotification } = useNotifications();
    const [showCustomSnoozeModal, setShowCustomSnoozeModal] = useState(false);

    useEffect(() => {
        const onCmdSnoozeNotification = (snoozeType: unknown) => {
            if (!activeNotification) return;

            if (snoozeType === SNOOZE_OPTIONS.UNTIL_CUSTOM_TIME) {
                setShowCustomSnoozeModal(true);
            } else if (typeof snoozeType === 'number') {
                void snooze(activeNotification.id, snoozeType).catch(() => undefined);
            } else {
                void snooze(activeNotification.id, findSnoozeTime(String(snoozeType)) || null).catch(() => undefined);
            }
        };

        emitter.on(CMD_SNOOZE_NOTIFICATION, onCmdSnoozeNotification);
        return () => emitter.off(CMD_SNOOZE_NOTIFICATION, onCmdSnoozeNotification);
    }, [activeNotification, snooze]);

    const scheduleCustomSnooze = (customSnoozeTime: Date | null) => {
        setShowCustomSnoozeModal(false);
        if (customSnoozeTime && activeNotification) {
            void snooze(activeNotification.id, getUnixTime(customSnoozeTime) || null).catch(() => undefined);
        }
    };

    // Bản gốc luôn quay về danh sách sau khi bấm xoá, kể cả khi thông báo của hội
    // thoại đang mở đã rời khỏi bộ lọc hiện tại.
    const deleteNotification = () => {
        if (activeNotification) void removeNotification(activeNotification).catch(() => undefined);
        onDeleted();
    };

    return (
        <div className="flex items-center justify-between w-full gap-2 border-b px-3 h-12 rtl:border-r border-n-weak flex-shrink-0 bg-n-surface-1">
            <div className="flex items-center gap-4">
                <BackButton compact buttonLabel={t('INBOX.ACTION_HEADER.BACK')} className="xl:hidden flex" />
                {totalLength > 1 ? (
                    <PaginationButton
                        totalLength={totalLength}
                        currentIndex={currentIndex + 1}
                        onPrev={onPrev}
                        onNext={onNext}
                    />
                ) : null}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    label={t('INBOX.ACTION_HEADER.SNOOZE')}
                    icon="i-lucide-bell-minus"
                    slate
                    xs
                    faded
                    className="[&>.truncate]:hidden md:[&>.truncate]:block"
                    onClick={() => openCommandBar({ parent: 'snooze_notification' })}
                />
                <Button
                    label={t('INBOX.ACTION_HEADER.DELETE')}
                    icon="i-lucide-trash-2"
                    slate
                    xs
                    faded
                    className="[&>.truncate]:hidden md:[&>.truncate]:block"
                    onClick={deleteNotification}
                />
            </div>
            <Modal show={showCustomSnoozeModal} onClose={() => setShowCustomSnoozeModal(false)}>
                <CustomSnoozeModal
                    onClose={() => setShowCustomSnoozeModal(false)}
                    onChooseTime={scheduleCustomSnooze}
                />
            </Modal>
        </div>
    );
}
