import { t } from '../../../../i18n';

// Tin đã xoá/thu hồi hiện theo ngôn ngữ của người xem, không theo chuỗi server lưu lúc xoá.
export function deletedMessageLabel(contentAttributes: unknown): string | null {
    const isDeleted = Boolean((contentAttributes as { deleted?: boolean } | null | undefined)?.deleted);

    return isDeleted ? t('CONVERSATION.MESSAGE_DELETED') : null;
}
