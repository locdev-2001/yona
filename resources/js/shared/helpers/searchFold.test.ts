import { describe, expect, it } from 'vitest';

import cases from './searchFold.cases.json';
import { foldSearchText, highlightSegments } from './searchFold';

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

    it('tô mọi lần xuất hiện, không chồng nhau', () => {
        expect(highlightSegments('Hà hà haha', 'ha')).toEqual([
            { text: 'Hà', match: true },
            { text: ' ', match: false },
            { text: 'hà', match: true },
            { text: ' ', match: false },
            { text: 'ha', match: true },
            { text: 'ha', match: true },
        ]);
    });

    it('ký tự đặc biệt của regex trong query được so như chữ thường', () => {
        expect(highlightSegments('giá (a+b) đơn', '(a+b)')).toEqual([
            { text: 'giá ', match: false },
            { text: '(a+b)', match: true },
            { text: ' đơn', match: false },
        ]);
    });

    it('query rỗng hoặc dài hơn text thì không tô gì', () => {
        expect(highlightSegments('Phở Bò', '   ')).toEqual([{ text: 'Phở Bò', match: false }]);
        expect(highlightSegments('Phở', 'phở bò tái')).toEqual([{ text: 'Phở', match: false }]);
        expect(highlightSegments('', 'a')).toEqual([{ text: '', match: false }]);
    });

    it('emoji không làm lệch vị trí đoạn khớp', () => {
        expect(highlightSegments('🎉 Chuyển khoản', 'khoan')).toEqual([
            { text: '🎉 Chuyển ', match: false },
            { text: 'khoản', match: true },
        ]);
    });
});
