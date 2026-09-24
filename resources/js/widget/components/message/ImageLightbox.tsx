import { useEffect, useState } from 'react';

import { t } from '../../i18n';
import { CloseIcon } from './icons';
import type { MessageAttachment } from '../../types';

// Xem toàn bộ ảnh của một tin khi bấm vào một ô hoặc ô "+N".
export default function ImageLightbox({
    images,
    startIndex,
    onClose,
}: {
    images: MessageAttachment[];
    startIndex: number;
    onClose: () => void;
}) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowRight') setCurrentIndex(index => Math.min(index + 1, images.length - 1));
            if (event.key === 'ArrowLeft') setCurrentIndex(index => Math.max(index - 1, 0));
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [images.length, onClose]);

    const current = images[Math.min(currentIndex, images.length - 1)];

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex flex-col bg-[var(--yona-chat-scrim)]">
            <div className="flex items-center justify-between px-4 py-2 text-[12px] text-[var(--yona-chat-on-scrim)]">
                <span>{`${currentIndex + 1}/${images.length}`}</span>
                <button
                    type="button"
                    aria-label={t('UNREAD_VIEW.CLOSE_MESSAGES_BUTTON')}
                    className="flex h-11 w-11 items-center justify-center"
                    onClick={onClose}
                >
                    <CloseIcon size={14} />
                </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
                <img src={current?.data_url} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            {images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto px-4 pb-4">
                    {images.map((image, index) => (
                        <button
                            key={image.id ?? image.data_url ?? index}
                            type="button"
                            className={`h-12 w-12 flex-none overflow-hidden rounded-[8px] ${index === currentIndex ? 'opacity-100' : 'opacity-50'}`}
                            onClick={() => setCurrentIndex(index)}
                        >
                            <img src={image.thumb_url || image.data_url} alt="" className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
