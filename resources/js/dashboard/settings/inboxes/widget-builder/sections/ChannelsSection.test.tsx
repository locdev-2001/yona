import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setLocale } from '../../../../../i18n';
import { DEFAULT_WIDGET_SETTINGS } from '../draft';
import ChannelsSection from './ChannelsSection';
import type { WidgetDraft } from '../types';

function baseDraft(): WidgetDraft {
    return {
        name: 'Gốm Mộc',
        widgetColor: '#1B6FCC',
        welcomeTagline: '',
        widgetSettings: {
            ...DEFAULT_WIDGET_SETTINGS,
            other_channels: [
                { kind: 'zalo', label: 'Zalo', value: 'https://zalo.me/0901000000', enabled: true },
                { kind: 'messenger', label: 'Messenger', value: 'https://m.me/gommoc', enabled: true },
            ],
        },
    };
}

function Harness({ initialDraft, errors = {} }: { initialDraft: WidgetDraft; errors?: Record<string, string> }) {
    const [draft, setDraft] = useState(initialDraft);

    return (
        <div>
            <ChannelsSection draft={draft} setDraft={setDraft} errors={errors} />
            <output data-testid="channel-kinds">{draft.widgetSettings.other_channels.map(channel => channel.kind).join(',')}</output>
        </div>
    );
}

describe('ChannelsSection — kênh khác và liên kết tuỳ chỉnh', () => {
    beforeEach(() => setLocale('vi'));
    afterEach(() => setLocale('en'));

    it('thêm kênh mới vào cuối danh sách', () => {
        render(<Harness initialDraft={baseDraft()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Thêm kênh' }));

        expect(screen.getByTestId('channel-kinds')).toHaveTextContent('zalo,messenger,zalo');
    });

    it('không cho thêm quá 6 kênh', () => {
        const draft = baseDraft();
        draft.widgetSettings.other_channels = Array.from({ length: 6 }, () => ({
            kind: 'zalo' as const,
            label: null,
            value: 'https://zalo.me/x',
            enabled: true,
        }));
        render(<Harness initialDraft={draft} />);

        expect(screen.queryByRole('button', { name: 'Thêm kênh' })).not.toBeInTheDocument();
    });

    it('xoá một kênh khỏi danh sách', () => {
        render(<Harness initialDraft={baseDraft()} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Xoá' })[0]);

        expect(screen.getByTestId('channel-kinds')).toHaveTextContent('messenger');
    });

    it('đưa kênh xuống dưới đổi đúng thứ tự', () => {
        render(<Harness initialDraft={baseDraft()} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Đưa xuống dưới' })[0]);

        expect(screen.getByTestId('channel-kinds')).toHaveTextContent('messenger,zalo');
    });

    it('đưa kênh lên trên đổi đúng thứ tự', () => {
        render(<Harness initialDraft={baseDraft()} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Đưa lên trên' })[1]);

        expect(screen.getByTestId('channel-kinds')).toHaveTextContent('messenger,zalo');
    });

    it('hiện lỗi 422 đúng ô giá trị của kênh', () => {
        render(<Harness initialDraft={baseDraft()} errors={{ 'other_channels.0': 'Kênh này chưa đúng định dạng' }} />);

        expect(screen.getByText('Kênh này chưa đúng định dạng')).toBeInTheDocument();
    });

    it('thêm liên kết tuỳ chỉnh mới, tối đa 5', () => {
        render(<Harness initialDraft={baseDraft()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Thêm liên kết' }));

        expect(screen.getAllByLabelText('Tên hiển thị')).toHaveLength(1);
    });
});
