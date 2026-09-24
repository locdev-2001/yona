import { describe, expect, it } from 'vitest';

import {
    DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE,
    checkFileSizeLimit,
    fileSizeInMegaBytes,
    filesFromDataTransfer,
    formatBytes,
    isFileTypeAccepted,
} from './FileHelper';
import { ALLOWED_FILE_TYPES } from 'shared/constants/messages';

describe('formatBytes', () => {
    it.each([
        [0, 2, '0 Bytes'],
        [1024, 2, '1 KB'],
        [1536, 2, '1.5 KB'],
        [1536, 0, '2 KB'],
        [1024 * 1024, 2, '1 MB'],
        [40 * 1024 * 1024, 2, '40 MB'],
    ])('%i byte (làm tròn %i chữ số) → %s', (bytes, decimals, expected) => {
        expect(formatBytes(bytes, decimals)).toBe(expected);
    });
});

describe('checkFileSizeLimit', () => {
    it('đúng bằng hạn mức vẫn được nhận', () => {
        expect(checkFileSizeLimit({ size: DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE * 1024 * 1024 }, 40)).toBe(true);
    });

    it('vượt hạn mức thì bị loại', () => {
        expect(checkFileSizeLimit({ size: 40 * 1024 * 1024 + 1 }, 40)).toBe(false);
    });

    it('lọc danh sách tệp theo hạn mức', () => {
        const files = [{ size: 1024 }, { size: 50 * 1024 * 1024 }, { size: 2 * 1024 * 1024 }];

        expect(files.filter((file) => checkFileSizeLimit(file, DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE))).toEqual([
            { size: 1024 },
            { size: 2 * 1024 * 1024 },
        ]);
    });
});

describe('fileSizeInMegaBytes', () => {
    it('quy đổi byte sang MB', () => {
        expect(fileSizeInMegaBytes(1024 * 1024)).toBe(1);
    });
});

describe('isFileTypeAccepted', () => {
    it.each([
        ['image.png', 'image/png', true],
        ['chuyen-khoan.jpg', 'image/jpeg', true],
        ['bao-gia.pdf', 'application/pdf', true],
        ['don-hang.XLSX', '', true],
        ['nen.rar', 'application/vnd.rar', true],
        ['cai-dat.exe', 'application/x-msdownload', false],
        ['script.sh', 'application/x-sh', false],
    ])('%s (%s) → %s theo danh sách của nút đính kèm', (name, type, accepted) => {
        expect(isFileTypeAccepted({ name, type }, ALLOWED_FILE_TYPES)).toBe(accepted);
    });
});

describe('filesFromDataTransfer', () => {
    it('chỉ lấy tệp có nội dung, không có dữ liệu thì rỗng', () => {
        const screenshot = new File(['png'], 'image.png', { type: 'image/png' });
        const empty = new File([], 'rong.txt', { type: 'text/plain' });

        expect(filesFromDataTransfer({ files: [screenshot, empty] } as unknown as DataTransfer)).toEqual([screenshot]);
        expect(filesFromDataTransfer(null)).toEqual([]);
    });
});
