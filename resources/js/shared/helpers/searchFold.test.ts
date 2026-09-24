import { describe, expect, it } from 'vitest';

import cases from './searchFold.cases.json';
import { foldedSearchWords, foldSearchText, highlightSegments } from './searchFold';

describe('foldSearchText', () => {
    it.each(cases)('fold "$input"', ({ input, folded }) => {
        expect(foldSearchText(input)).toBe(folded);
    });
});

describe('highlightSegments', () => {
    it('khớp không dấu và giữ nguyên chữ gốc', () => {
        expect(highlightSegments('Nguyễn Văn Đức', 'duc')).toEqual([
            { text: 'Nguyễn Văn ', match: false },
            { text: 'Đức', match: true },
        ]);
    });

    it('đoạn khớp trên chuỗi NFD nuốt trọn dấu kết hợp đứng sau', () => {
        const nfd = 'Báo giá';

        expect(highlightSegments(nfd, 'bao')).toEqual([
            { text: 'Báo', match: true },
            { text: ' giá', match: false },
        ]);
        expect(highlightSegments(nfd, 'gia')).toEqual([
            { text: 'Báo ', match: false },
            { text: 'giá', match: true },
        ]);
    });

    it('tô mọi lần xuất hiện, đoạn chỉ cách nhau khoảng trắng gộp làm một', () => {
        expect(highlightSegments('Hà hà, haha', 'ha')).toEqual([
            { text: 'Hà hà', match: true },
            { text: ', ', match: false },
            { text: 'haha', match: true },
        ]);
    });

    it('tô từng từ của từ khoá dù không liền nhau hay đảo thứ tự', () => {
        expect(highlightSegments('Gửi shop bảng giá sỉ tháng 10', 'thang 10 bang gia')).toEqual([
            { text: 'Gửi shop ', match: false },
            { text: 'bảng giá', match: true },
            { text: ' sỉ ', match: false },
            { text: 'tháng 10', match: true },
        ]);
    });

    it('tên tệp nối bằng - _ . khớp từ khoá gõ bằng khoảng trắng, giữ nguyên chữ gốc', () => {
        expect(highlightSegments('bao-gia_thang-9.pdf', 'bao gia thang 9')).toEqual([
            { text: 'bao-gia_thang-9', match: true },
            { text: '.pdf', match: false },
        ]);
        expect(highlightSegments('Báo giá tháng 9.pdf', 'bao-gia')).toEqual([
            { text: 'Báo giá', match: true },
            { text: ' tháng 9.pdf', match: false },
        ]);
    });

    it('hai từ chồng lên nhau tô thành một đoạn', () => {
        expect(highlightSegments('giảm giá', 'gia giam')).toEqual([
            { text: 'giảm giá', match: true },
        ]);
    });

    it('ký tự đặc biệt của regex trong query được so như chữ thường', () => {
        expect(highlightSegments('giá (a+b) đơn', '(a+b)')).toEqual([
            { text: 'giá ', match: false },
            { text: '(a+b)', match: true },
            { text: ' đơn', match: false },
        ]);
    });

    it('query rỗng hoặc chỉ có dấu ngăn cách thì không tô gì', () => {
        expect(highlightSegments('Phở Bò', '   ')).toEqual([{ text: 'Phở Bò', match: false }]);
        expect(highlightSegments('Phở-Bò', ' - _ ')).toEqual([{ text: 'Phở-Bò', match: false }]);
        expect(highlightSegments('', 'a')).toEqual([{ text: '', match: false }]);
    });

    it('chỉ tô từ có mặt khi từ khoá dài hơn chữ', () => {
        expect(highlightSegments('Phở', 'phở bò tái')).toEqual([{ text: 'Phở', match: true }]);
    });

    it('emoji không làm lệch vị trí đoạn khớp', () => {
        expect(highlightSegments('🎉 Chuyển khoản', 'khoan')).toEqual([
            { text: '🎉 Chuyển ', match: false },
            { text: 'khoản', match: true },
        ]);
    });
});

describe('foldedSearchWords', () => {
    it('tách từ khoá đã fold theo khoảng trắng, bỏ từ trùng', () => {
        expect(foldedSearchWords('  Bảng-giá   SỈ bang ')).toEqual(['bang', 'gia', 'si']);
        expect(foldedSearchWords(' -_./ ')).toEqual([]);
    });
});
