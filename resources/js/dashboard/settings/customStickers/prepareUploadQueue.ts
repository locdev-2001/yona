import { t } from '../../../i18n';
import { isAnimatedImageBytes, loadImage, releaseImage } from './stickerSourceImage';

// Đường vào chung của mọi cách thêm ảnh (nút chọn, ô "+", kéo thả, dán): lọc trước khi mở
// trình chỉnh để hàng chờ chỉ có ảnh dựng được sticker, bộ đếm "Ảnh 1/N" chỉ tính ảnh hợp lệ.

export type UploadRejectionReason = 'type' | 'animated_too_large' | 'unreadable';

export interface RejectedUpload {
    name: string;
    reason: UploadRejectionReason;
}

export interface UploadQueuePlan {
    valid: File[];
    rejected: RejectedUpload[];
}

export interface UploadQueueRules {
    acceptedExtensions: readonly string[];
    // <= 0 khi máy chủ chưa báo giới hạn.
    maxBytes: number;
}

export type ImageReadabilityCheck = (file: File) => Promise<boolean>;

const REASON_KEY: Record<UploadRejectionReason, string> = {
    type: 'TYPE',
    animated_too_large: 'ANIMATED_TOO_LARGE',
    unreadable: 'UNREADABLE',
};

const fileExtension = (file: File) => (file.name.includes('.') ? (file.name.split('.').pop()?.toLowerCase() ?? '') : '');

export const decodesAsImage: ImageReadabilityCheck = async file => {
    try {
        releaseImage(await loadImage(file));
        return true;
    } catch {
        return false;
    }
};

async function rejectionOf(file: File, rules: UploadQueueRules, isReadable: ImageReadabilityCheck): Promise<UploadRejectionReason | null> {
    if (!rules.acceptedExtensions.includes(fileExtension(file))) return 'type';
    if (rules.maxBytes > 0 && file.size > rules.maxBytes && isAnimatedImageBytes(new Uint8Array(await file.arrayBuffer()))) {
        return 'animated_too_large';
    }

    return (await isReadable(file)) ? null : 'unreadable';
}

export async function prepareUploadQueue(
    files: readonly File[],
    rules: UploadQueueRules,
    isReadable: ImageReadabilityCheck = decodesAsImage,
): Promise<UploadQueuePlan> {
    const reasons = await Promise.all(files.map(file => rejectionOf(file, rules, isReadable)));

    return {
        valid: files.filter((_, index) => reasons[index] === null),
        rejected: files.flatMap((file, index) => {
            const reason = reasons[index];
            return reason === null ? [] : [{ name: file.name, reason }];
        }),
    };
}

/** "not-image.txt (không phải ảnh), a.gif (ảnh động quá nặng)". */
export const describeRejected = (rejected: readonly RejectedUpload[]) =>
    rejected.map(({ name, reason }) => t('STICKER_LIBRARY.REJECTED_FILE', { filename: name, reason: t(`STICKER_LIBRARY.REJECT_REASON.${REASON_KEY[reason]}`) })).join(', ');
