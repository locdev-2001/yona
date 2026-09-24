import { describe, expect, it } from 'vitest';

import {
    DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE,
    checkFileSizeLimit,
    fileSizeInMegaBytes,
    filesFromDataTransfer,
    formatBytes,
    isFileTypeAccepted,
    splitFileNameForMiddleTruncation,
    uploadProgressByFile,
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

describe('splitFileNameForMiddleTruncation', () => {
    it('giữ vài ký tự cuối và phần mở rộng ở đuôi', () => {
        expect(splitFileNameForMiddleTruncation('bao-gia-thang-9-khach-le-final.pdf')).toStrictEqual({
            head: 'bao-gia-thang-9-khach-le-f',
            tail: 'inal.pdf',
        });
    });

    it('tên ngắn hơn phần giữ lại thì nằm trọn ở đuôi', () => {
        expect(splitFileNameForMiddleTruncation('a.txt')).toStrictEqual({ head: '', tail: 'a.txt' });
    });

    it('không có phần mở rộng hợp lệ thì chỉ giữ ký tự cuối', () => {
        expect(splitFileNameForMiddleTruncation('README')).toStrictEqual({ head: 'RE', tail: 'ADME' });
        expect(splitFileNameForMiddleTruncation('.env')).toStrictEqual({ head: '', tail: '.env' });
        expect(splitFileNameForMiddleTruncation('ban.sao.khong-phai-duoi-tep')).toStrictEqual({
            head: 'ban.sao.khong-phai-duoi',
            tail: '-tep',
        });
    });
});

describe('uploadProgressByFile', () => {
    it('tệp đi trước đầy trước, tệp sau bắt đầu khi tệp trước xong', () => {
        expect(uploadProgressByFile(0, 400, [100, 300])).toStrictEqual([0, 0]);
        expect(uploadProgressByFile(50, 400, [100, 300])).toStrictEqual([0.5, 0]);
        expect(uploadProgressByFile(250, 400, [100, 300])).toStrictEqual([1, 0.5]);
        expect(uploadProgressByFile(400, 400, [100, 300])).toStrictEqual([1, 1]);
    });

    it('phần đầu multipart (ranh giới, trường chữ) được chia đều theo tỉ lệ', () => {
        expect(uploadProgressByFile(250, 500, [100, 300])).toStrictEqual([1, 1 / 3]);
    });

    it('chưa biết tổng thì mọi tệp là 0', () => {
        expect(uploadProgressByFile(10, 0, [100])).toStrictEqual([0]);
        expect(uploadProgressByFile(10, 10, [])).toStrictEqual([]);
    });
});
