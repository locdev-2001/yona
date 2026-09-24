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
