import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_TOLERANCE } from 'sticker-renderer/image/background-mask.mjs';

import { t } from '../../../i18n';
import StickerEditorWorkspace from './StickerEditorWorkspace';
import { defaultCrop } from './stickerEdit';
import type { StickerDraft } from './stickerEdit';
import type { StickerUpload } from './stickerLibraryApi';
import { SECONDARY_BUTTON_CLASS } from './stickerLibraryStyles';
import { createStickerMaskRunner } from './stickerMaskRunner';
import type { StickerMaskRunner } from './stickerMaskRunner';
import { decodeStickerSource } from './stickerSourceImage';
import type { DecodedStickerSource } from './stickerSourceImage';

// Trình chỉnh một ảnh thành sticker: cắt vuông, xoá nền (loang màu từ mép, đũa thần,
// cọ), xem trước ở cỡ thật rồi gửi ảnh gốc kèm `edit` cho máy chủ dựng bản cuối.
// Tự vẽ bằng màu tĩnh của theme vì còn chạy trong console Super Admin.

interface StickerImageEditorProps {
    file: File;
    position: number;
    total: number;
    imageSize: number;
    onSave: (upload: StickerUpload) => Promise<void>;
    onSkip: () => void;
    onClose: () => void;
}

type LoadState =
    | { status: 'loading' }
    | { status: 'failed' }
    | { status: 'ready'; source: DecodedStickerSource; runner: StickerMaskRunner; initialDraft: StickerDraft };

function useEditableSource(file: File): LoadState {
    const [state, setState] = useState<LoadState>({ status: 'loading' });

    useEffect(() => {
        let isCurrent = true;
        const runner = createStickerMaskRunner();
        setState({ status: 'loading' });

        decodeStickerSource(file)
            .then(async source => {
                const subject = await runner.load(source.pixels);
                if (!isCurrent) return;
                const initialDraft: StickerDraft = {
                    crop: defaultCrop(subject, source.pixels),
                    removeBackground: true,
                    tolerance: DEFAULT_TOLERANCE,
                    edits: [],
                };
                setState({ status: 'ready', source, runner, initialDraft });
            })
            .catch(() => {
                if (isCurrent) setState({ status: 'failed' });
            });

        return () => {
            isCurrent = false;
            runner.dispose();
        };
    }, [file]);

    return state;
}

export default function StickerImageEditor({ file, position, total, imageSize, onSave, onSkip, onClose }: StickerImageEditorProps) {
    const loaded = useEditableSource(file);

    // Gắn vào body để nằm trên mọi lớp cố định của khung dashboard (nút mở menu trên điện thoại).
    return createPortal(
        <div className="fixed inset-0 z-50 flex bg-slate-900/40 md:items-center md:justify-center md:p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sticker-image-editor-title"
                className="flex size-full flex-col bg-white md:h-auto md:max-h-full md:max-w-4xl md:rounded-xl md:shadow-xl"
            >
                <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-2">
                    <div className="flex min-w-0 flex-1 flex-col">
                        <h3 id="sticker-image-editor-title" className="m-0 text-base font-medium text-slate-900">
                            {t('STICKER_LIBRARY.EDITOR.TITLE')}
                        </h3>
                        <span className="truncate text-xs text-slate-600">
                            {t('STICKER_LIBRARY.EDITOR.POSITION', { index: position, total })} · {file.name}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="reset-base inline-flex size-11 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-slate-50 active:scale-[0.97] md:size-9"
                        onClick={onClose}
                        aria-label={t('STICKER_LIBRARY.EDITOR.CLOSE')}
                        title={t('STICKER_LIBRARY.EDITOR.CLOSE')}
                    >
                        <span className="i-lucide-x size-5" aria-hidden="true" />
                    </button>
                </header>
                {loaded.status === 'ready' ? (
                    <StickerEditorWorkspace
                        source={loaded.source}
                        runner={loaded.runner}
                        initialDraft={loaded.initialDraft}
                        imageSize={imageSize}
                        onSave={onSave}
                        onSkip={onSkip}
                    />
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                        {loaded.status === 'loading' ? (
                            <p className="m-0 text-sm text-slate-600">{t('STICKER_LIBRARY.EDITOR.LOADING')}</p>
                        ) : (
                            <>
                                <p role="alert" className="m-0 text-sm text-red-700">
                                    {t('STICKER_LIBRARY.EDITOR.LOAD_FAILED')}
                                </p>
                                <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onSkip}>
                                    {t('STICKER_LIBRARY.EDITOR.SKIP')}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
