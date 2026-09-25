import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { getLocale, setLocale } from '../../../i18n';
import CardsCarousel, { formatCardPrice } from './CardsCarousel';

const initialLocale = getLocale();
afterEach(() => setLocale(initialLocale));

describe('CardsCarousel', () => {
    it('thẻ có giá hiện dòng giá riêng dưới mô tả, thẻ không có giá thì không', () => {
        const { container } = render(
            <CardsCarousel
                items={[
                    { title: 'Bàn nâng hạ Ergo M', description: '120×60cm · gỗ sồi', price: '4.290.000 ₫' },
                    { title: 'Ghế công thái học', description: 'Lưới thoáng' },
                ]}
            />,
        );

        const prices = container.querySelectorAll('.yona-card-price');
        expect(prices).toHaveLength(1);
        expect(prices[0]).toHaveTextContent('4.290.000 ₫');
        expect(prices[0].previousElementSibling).toHaveTextContent(/^120×60cm · gỗ sồi$/);
    });

    it('giá dạng số nhóm chữ số theo ngôn ngữ widget, giá dạng chuỗi giữ nguyên', () => {
        setLocale('vi');
        expect(formatCardPrice(5590000)).toBe('5.590.000');
        expect(formatCardPrice('4.290.000 ₫')).toBe('4.290.000 ₫');

        setLocale('en');
        expect(formatCardPrice(5590000)).toBe('5,590,000');
    });
});
