import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';

// Tệp còn nằm ở máy (khay đính kèm, tin đang gửi) mang hình dạng đính kèm của
// tin để dùng lại bong bóng và trình xem ảnh của khung chat.

const FILE_TYPE_BY_MIME_PREFIX: Array<[string, string]> = [
    ['image/', 'image'],
    ['video/', 'video'],
    ['audio/', 'audio'],
];

export function fileExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

export function attachmentFileType(file: Pick<File, 'type'>): string {
    return FILE_TYPE_BY_MIME_PREFIX.find(([prefix]) => file.type.startsWith(prefix))?.[1] ?? 'file';
}

export function isMediaFile(file: Pick<File, 'type'>): boolean {
    return ['image', 'video'].includes(attachmentFileType(file));
}

/** `previewUrl` là URL đọc được ngay trong trình duyệt (data: hoặc blob:) của chính tệp. */
export function localFileAttachment(file: File, previewUrl: string, id: number): MessageAttachment {
    return {
        id,
        file_type: attachmentFileType(file),
        extension: fileExtension(file.name),
        data_url: previewUrl,
        thumb_url: previewUrl,
        file_size: file.size,
        filename: file.name,
    };
}
