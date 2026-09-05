import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';
import Editor from 'dashboard/components/widgets/WootWriter/Editor';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../types';

// Phần thân dùng chung của AddCanned.vue và EditCanned.vue (hai file gốc lặp
// nguyên khối form) — giữ nguyên DOM/class, khác nhau ở header + cách chạm
// (blur khi thêm, input khi sửa).

export interface CannedFormValues {
    short_code: string;
    content: string;
}

// vuelidate: shortCode required + minLength(2), content required.
export function isShortCodeInvalid(shortCode: string): boolean {
    return shortCode.trim().length < 2;
}

export function isContentInvalid(content: string): boolean {
    return !content.trim();
}

interface CannedFormProps {
    headerTitle: string;
    headerContent?: string;
    shortCodeLabel: string;
    shortCodePlaceholder: string;
    contentLabel: string;
    contentPlaceholder: string;
    cancelLabel: string;
    submitLabel: string;
    // AddCanned chạm khi blur, EditCanned chạm ngay khi gõ.
    touchShortCodeOnInput?: boolean;
    initialValues: CannedFormValues;
    isSubmitting: boolean;
    onSubmit: (values: CannedFormValues) => void;
    onClose: () => void;
}

export default function CannedForm({
    headerTitle,
    headerContent = '',
    shortCodeLabel,
    shortCodePlaceholder,
    contentLabel,
    contentPlaceholder,
    cancelLabel,
    submitLabel,
    touchShortCodeOnInput = false,
    initialValues,
    isSubmitting,
    onSubmit,
    onClose,
}: CannedFormProps) {
    const { auth } = usePage<DashboardPageProps>().props;
    const uiSettings = (auth.user?.ui_settings ?? {}) as UISettings;

    const [shortCode, setShortCode] = useState(initialValues.short_code);
    const [content, setContent] = useState(initialValues.content);
    const [isShortCodeTouched, setShortCodeTouched] = useState(false);
    const [isContentTouched, setContentTouched] = useState(false);

    const shortCodeError = isShortCodeTouched && isShortCodeInvalid(shortCode);
    const contentError = isContentTouched && isContentInvalid(content);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit({ short_code: shortCode, content });
    };

    // Gốc lồng hai lớp Modal (Index.vue mở `woot-modal`, AddCanned/EditCanned lại
    // bọc `Modal` của riêng nó) → nền mờ chồng hai lớp; giữ đúng để khớp pixel.
    return (
        <Modal show onClose={onClose}>
        <div className="flex flex-col h-auto overflow-auto">
            <ModalHeader headerTitle={headerTitle} headerContent={headerContent} />
            <form className="flex flex-col w-full" onSubmit={submit}>
                <div className="w-full">
                    <label className={shortCodeError ? 'error' : undefined}>
                        {shortCodeLabel}
                        <input
                            type="text"
                            value={shortCode}
                            placeholder={shortCodePlaceholder}
                            onChange={event => {
                                setShortCode(event.target.value);
                                if (touchShortCodeOnInput) setShortCodeTouched(true);
                            }}
                            onBlur={() => setShortCodeTouched(true)}
                        />
                    </label>
                </div>

                <div className="w-full">
                    <label className={contentError ? 'error' : undefined}>{contentLabel}</label>
                    <div className="editor-wrap [&_.ProseMirror-menubar]:hidden [&_.ProseMirror-woot-style]:min-h-[12.5rem]">
                        <Editor
                            value={content}
                            editorId="canned-response"
                            className={`message-editor [&>div]:px-1 ${contentError ? 'editor_warning' : ''}`}
                            channelType="Context::Default"
                            enableCannedResponses={false}
                            placeholder={contentPlaceholder}
                            uiSettings={uiSettings}
                            onChange={setContent}
                            onBlur={() => setContentTouched(true)}
                        />
                    </div>
                </div>
                <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
                    <Button
                        faded
                        slate
                        type="reset"
                        label={cancelLabel}
                        onClick={event => {
                            event.preventDefault();
                            onClose();
                        }}
                    />
                    <Button
                        type="submit"
                        label={submitLabel}
                        disabled={isContentInvalid(content) || isShortCodeInvalid(shortCode) || isSubmitting}
                        isLoading={isSubmitting}
                    />
                </div>
            </form>
        </div>
        </Modal>
    );
}
