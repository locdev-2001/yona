import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { t } from '../../../../i18n';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

export interface SettingsDraft<T> {
    draft: T;
    setDraft: Dispatch<SetStateAction<T>>;
    patchDraft: (patch: Partial<T>) => void;
    isDirty: boolean;
    isSaving: boolean;
    /** Vài ô vừa được lưu riêng (nút lưu tại chỗ): cập nhật cả mốc đã lưu lẫn bản nháp, ô khác đang sửa dở giữ nguyên. */
    acceptSaved: (patch: Partial<T>) => void;
    /** Bỏ bản nháp, trở về giá trị đang lưu. */
    reset: () => void;
    /** Gửi bản nháp; `persist` trả false (hoặc ném lỗi) nghĩa là chưa lưu được, bản nháp giữ nguyên. */
    save: (persist: (draft: T) => Promise<boolean>) => Promise<void>;
}

const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/**
 * Mô hình lưu chung của mọi tab cài đặt hộp thư: sửa trên bản nháp, một thanh
 * "Lưu thay đổi / Huỷ", rời trang hay đổi tab khi còn sửa dở thì hỏi lại.
 * `source` là giá trị đang lưu (dựng từ hộp thư); máy chủ trả hộp thư mới thì
 * bản nháp và mốc "đã lưu" cùng đổi theo.
 */
export function useSettingsDraft<T>(source: T): SettingsDraft<T> {
    const [saved, setSaved] = useState(source);
    const [draft, setDraft] = useState(source);
    const [isSaving, setSaving] = useState(false);
    const sourceKey = JSON.stringify(source);

    useEffect(() => {
        setSaved(source);
        setDraft(source);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- so theo nội dung, không theo tham chiếu
    }, [sourceKey]);

    const isDirty = !sameValue(draft, saved);
    useUnsavedChangesGuard(isDirty, t('SETTINGS_DRAFT.CONFIRM_LEAVE'));

    return {
        draft,
        setDraft,
        patchDraft: patch => setDraft(current => ({ ...current, ...patch })),
        acceptSaved: patch => {
            setSaved(current => ({ ...current, ...patch }));
            setDraft(current => ({ ...current, ...patch }));
        },
        isDirty,
        isSaving,
        reset: () => setDraft(saved),
        save: async persist => {
            setSaving(true);
            try {
                const submitted = draft;
                if (await persist(submitted)) setSaved(submitted);
            } finally {
                setSaving(false);
            }
        },
    };
}
