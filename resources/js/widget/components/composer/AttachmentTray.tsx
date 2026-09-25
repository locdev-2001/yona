import { useEffect, useMemo } from 'react';

import { t } from '../../i18n';

interface AttachmentTrayProps {
    files: File[];
    onRemove: (fileIndex: number) => void;
    onAddMore: () => void;
}

const isImageFile = (file: File): boolean => file.type.startsWith('image/');

// Khay tệp đã chọn nằm trên ô nhập: ô 46px có nút xoá góc, ô "+" để chọn thêm.
export default function AttachmentTray({ files, onRemove, onAddMore }: AttachmentTrayProps) {
    const previewUrls = useMemo(
        () => files.map(file => (isImageFile(file) ? window.URL.createObjectURL(file) : null)),
        [files],
    );

    useEffect(
        () => () => previewUrls.forEach(previewUrl => previewUrl && window.URL.revokeObjectURL(previewUrl)),
        [previewUrls],
    );

    const imageCount = files.filter(isImageFile).length;

    return (
        <div className="mb-[9px] flex items-center gap-2">
            <div className="flex items-center gap-2 overflow-x-auto py-1.5 -my-1.5 pe-1.5 no-scrollbar">
                {files.map((file, fileIndex) => (
                    <div
                        key={`${file.name}-${file.size}-${fileIndex}`}
                        className="relative flex-shrink-0 size-[46px] rounded-[10px] bg-[var(--yona-chat-field)]"
                        title={file.name}
                    >
                        {previewUrls[fileIndex] ? (
                            <img
                                src={previewUrls[fileIndex] as string}
                                alt={file.name}
                                className="object-cover w-full h-full rounded-[10px]"
                            />
                        ) : (
                            <span className="flex items-center justify-center w-full h-full text-[var(--yona-chat-ink-soft)]">
                                <span className="i-lucide-file size-5" />
                            </span>
                        )}
                        <button
                            type="button"
                            aria-label={`${t('COMPOSER.REMOVE_ATTACHMENT')} ${file.name}`}
                            className="absolute flex items-center justify-center rounded-full -top-1.5 -end-1.5 size-5 bg-[var(--yona-chat-solid)] text-[var(--yona-chat-on-solid)] ring-2 ring-[var(--yona-chat-panel)] after:absolute after:-inset-3 after:content-['']"
                            onClick={() => onRemove(fileIndex)}
                        >
                            <span className="i-lucide-x size-3" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    aria-label={t('COMPOSER.ADD_MORE')}
                    title={t('COMPOSER.ADD_MORE')}
                    className="flex items-center justify-center flex-shrink-0 size-[46px] rounded-[10px] border border-dashed border-[var(--yona-chat-line-strong)] text-[var(--yona-chat-ink-soft)]"
                    onClick={onAddMore}
                >
                    <span className="i-lucide-plus size-5" />
                </button>
            </div>
            {imageCount > 0 ? (
                <div className="flex-none text-[11px] leading-[1.4] text-[var(--yona-chat-ink-muted)]">
                    {t('COMPOSER.SELECTED_COUNT', { count: imageCount })}
                </div>
            ) : null}
        </div>
    );
}
