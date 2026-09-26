import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setLocale, t } from '../../../../../i18n';
import AiSection from './AiSection';

describe('AiSection — trợ lý AI chưa có, không được nói dối bằng công tắc chết', () => {
    beforeEach(() => setLocale('vi'));
    afterEach(() => setLocale('en'));

    it('không có công tắc bật/tắt nào (checkbox hay switch)', () => {
        render(<AiSection />);

        expect(screen.queryAllByRole('switch')).toHaveLength(0);
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('không có nút lưu riêng cho thẻ này', () => {
        render(<AiSection />);

        expect(screen.queryByRole('button', { name: /lưu/i })).not.toBeInTheDocument();
    });

    it('nói rõ đây là tính năng sắp ra mắt', () => {
        render(<AiSection />);

        expect(screen.getByText(t('WIDGET_BUILDER.COMING_SOON'))).toBeInTheDocument();
        expect(screen.getByText(t('WIDGET_BUILDER.AI.DESCRIPTION'))).toBeInTheDocument();
    });
});
