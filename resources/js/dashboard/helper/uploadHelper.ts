// Port từ dashboard/helper/uploadHelper.js — cửa tải tệp dùng chung
// (POST /api/v1/accounts/{id}/upload) cho logo portal và ảnh trong bài viết.
import { postForm, postJson } from './apiClient';

interface UploadResponse {
    file_url: string;
    blob_key?: string;
    blob_id?: string | number;
}

export interface UploadResult {
    fileUrl: string;
    blobKey?: string;
    blobId?: string | number;
}

function resolveAccountId(accountId?: number | string): string {
    return String(accountId ?? window.location.pathname.split('/')[3]);
}

function toResult(data: UploadResponse): UploadResult {
    return { fileUrl: data.file_url, blobKey: data.blob_key, blobId: data.blob_id };
}

export async function uploadFile(file: File, accountId?: number | string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('attachment', file);

    return toResult(await postForm<UploadResponse>(`/api/v1/accounts/${resolveAccountId(accountId)}/upload`, formData));
}

export async function uploadExternalImage(url: string, accountId?: number | string): Promise<UploadResult> {
    return toResult(
        await postJson<UploadResponse>(`/api/v1/accounts/${resolveAccountId(accountId)}/upload`, { external_url: url }),
    );
}
