import type { ReactNode } from 'react';

import FileIcon from 'dashboard/components-next/icon/FileIcon';
import { formatBytes, splitFileNameForMiddleTruncation } from 'shared/helpers/FileHelper';

// Thẻ tệp một dòng dùng chung cho tin đã gửi và khay đính kèm của ô soạn: icon
// theo loại, tên cắt ở giữa (luôn thấy đuôi tệp), dung lượng, một nút hành động.
interface FileCardProps {
    fileName: string;
    extension: string;
    fileSize?: number | null;
    // Tỉ lệ 0–1 khi tệp đang được tải lên.
    uploadProgress?: number | null;
    action?: ReactNode;
    className?: string;
}

export default function FileCard({ fileName, extension, fileSize, uploadProgress, action, className = '' }: FileCardProps) {
    const { head, tail } = splitFileNameForMiddleTruncation(fileName);
    const progressPercent = uploadProgress == null ? null : Math.round(uploadProgress * 100);

    return (
        <div
            data-testid="file-card"
            title={fileName}
            className={`relative flex items-center gap-2 h-10 w-64 max-w-full min-w-0 ps-2.5 pe-1 overflow-hidden rounded-lg border border-n-container bg-n-alpha-white ${className}`}
        >
            <FileIcon fileType={extension} className="size-5 shrink-0 text-n-slate-11" />
            <span className="flex flex-1 min-w-0 text-sm text-n-slate-12">
                <span className="truncate whitespace-pre">{head}</span>
                <span className="shrink-0 whitespace-pre">{tail}</span>
            </span>
            {fileSize ? (
                <span className="shrink-0 text-xs tabular-nums text-n-slate-11">{formatBytes(fileSize, 1)}</span>
            ) : null}
            {action}
            {progressPercent !== null ? (
                <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-n-alpha-2"
                >
                    <div className="h-full bg-n-brand transition-[width]" style={{ width: `${progressPercent}%` }} />
                </div>
            ) : null}
        </div>
    );
}
