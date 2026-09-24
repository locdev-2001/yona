// Port từ shared/helpers/FileHelper.js (phần ReplyBox cần).
export const DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE = 40;

export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const fileSizeInMegaBytes = (bytes: number): number => bytes / (1024 * 1024);

export const checkFileSizeLimit = (file: { size: number }, maximumUploadLimit: number): boolean =>
    fileSizeInMegaBytes(file.size) <= maximumUploadLimit;

/** Tệp thật (bỏ mục rỗng) trong clipboard hoặc cú kéo-thả: ảnh chụp màn hình, ảnh copy từ web, tệp copy từ máy. */
export const filesFromDataTransfer = (data: DataTransfer | null | undefined): File[] =>
    Array.from(data?.files ?? []).filter(file => file.size > 0);

/** Cùng luật với thuộc tính `accept` của `<input type="file">`: đuôi `.ext`, `type/*` hoặc MIME đầy đủ. */
export const isFileTypeAccepted = (file: { name: string; type: string }, accept: string): boolean => {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();

    return accept
        .split(/[\s,]+/)
        .filter(Boolean)
        .some(rule => {
            const pattern = rule.toLowerCase();
            if (pattern.startsWith('.')) return fileName.endsWith(pattern);
            if (pattern.endsWith('/*')) return mimeType.startsWith(pattern.slice(0, -1));
            return mimeType === pattern;
        });
};

const MAX_VISIBLE_EXTENSION_LENGTH = 8;

/**
 * Tách tên tệp để cắt ở giữa: `head` co lại theo bề ngang, `tail` (vài ký tự
 * cuối của tên + phần mở rộng) luôn hiện đủ để người xem biết loại tệp.
 */
export const splitFileNameForMiddleTruncation = (
    fileName: string,
    keptTailChars = 4,
): { head: string; tail: string } => {
    const dotIndex = fileName.lastIndexOf('.');
    const hasExtension = dotIndex > 0 && fileName.length - dotIndex - 1 <= MAX_VISIBLE_EXTENSION_LENGTH;
    const baseName = hasExtension ? fileName.slice(0, dotIndex) : fileName;
    const extension = hasExtension ? fileName.slice(dotIndex) : '';
    const tailStart = Math.max(0, baseName.length - keptTailChars);

    return { head: baseName.slice(0, tailStart), tail: `${baseName.slice(tailStart)}${extension}` };
};

/**
 * Một yêu cầu multipart gửi các tệp nối tiếp theo thứ tự đính kèm, nên tỉ lệ
 * đã tải của từng tệp suy ra được từ tổng số byte đã gửi. Trả tỉ lệ 0–1.
 */
export const uploadProgressByFile = (loadedBytes: number, totalBytes: number, fileSizes: number[]): number[] => {
    const allFileBytes = fileSizes.reduce((sum, size) => sum + size, 0);
    if (totalBytes <= 0 || allFileBytes <= 0) return fileSizes.map(() => 0);

    const loadedFileBytes = Math.min(1, Math.max(0, loadedBytes / totalBytes)) * allFileBytes;
    let fileStart = 0;

    return fileSizes.map(size => {
        const start = fileStart;
        fileStart += size;
        if (size <= 0) return loadedFileBytes >= start ? 1 : 0;

        return Math.min(1, Math.max(0, (loadedFileBytes - start) / size));
    });
};
