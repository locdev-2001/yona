import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../../i18n';
import CustomerSatisfactionPage from './CustomerSatisfactionPage';
import type { Inbox } from '../types';

const patchJson = vi.fn();

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 3 } } }),
    router: { on: () => () => undefined },
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: () => Promise.resolve({ payload: [] }),
    patchJson: (...args: unknown[]) => patchJson(...args),
}));

const inbox = {
    id: 140,
    csat_survey_enabled: true,
    csat_config: { display_type: 'star', message: 'Chị chấm giúp shop nhé', survey_rules: { operator: 'contains', values: [] } },
} as unknown as Inbox;

describe('CustomerSatisfactionPage', () => {
    beforeEach(() => {
        setLocale('vi');
        patchJson.mockReset();
    });

    it('nói rõ khách chấm 3 mức và không còn ô chọn kiểu hiển thị', () => {
        render(<CustomerSatisfactionPage inbox={inbox} uiSettings={{}} onInboxUpdated={() => undefined} />);

        expect(screen.getByText(/chấm theo 3 mức: Kém, Ổn, Tuyệt/)).toBeInTheDocument();
        expect(screen.queryByText('Kiểu hiển thị')).not.toBeInTheDocument();
        expect(document.querySelector('[name="display_type"]')).toBeNull();
    });

    it('lưu mà không làm mất các khóa đã lưu của khảo sát', async () => {
        patchJson.mockResolvedValue(inbox);
        render(<CustomerSatisfactionPage inbox={inbox} uiSettings={{}} onInboxUpdated={() => undefined} />);

        expect(screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') })).toBeDisabled();
        fireEvent.click(screen.getByRole('switch'));
        fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') }));

        await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));
        expect(patchJson).toHaveBeenCalledWith('/api/v1/accounts/3/inboxes/140', {
            csat_survey_enabled: false,
            csat_config: { display_type: 'star', message: 'Chị chấm giúp shop nhé', survey_rules: { operator: 'contains', values: [] } },
        });
    });
});
