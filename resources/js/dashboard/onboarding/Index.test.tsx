import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
const account = { id: 7, name: 'Shop Hoa', locale: 'en', custom_attributes: { onboarding_step: 'account_details' } };

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Lan', email: 'lan@shophoa.vn' } },
            account,
            languages: [
                { name: 'Tiếng Việt', iso_639_1_code: 'vi' },
                { name: 'English', iso_639_1_code: 'en' },
            ],
        },
    }),
    router: { post: (...args: unknown[]) => post(...args) },
}));

import OnboardingIndex from './Index';

function mockBrowserTimezones(browserZone: string, supportedZones: string[]) {
    vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue(supportedZones);
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        ...new Intl.DateTimeFormat('en', { timeZone: 'UTC' }).resolvedOptions(),
        timeZone: browserZone,
    });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
const postedFields = () => post.mock.calls[0][1] as Record<string, string>;

describe('Onboarding account details', () => {
    beforeEach(() => {
        post.mockReset();
        account.locale = 'en';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('preselects the browser time zone even when the list only has its legacy name', () => {
        mockBrowserTimezones('Asia/Ho_Chi_Minh', ['Africa/Abidjan', 'Asia/Saigon', 'Europe/London']);

        render(<OnboardingIndex />);

        const timezoneSelect = screen.getByRole('combobox', { name: 'Timezone' }) as HTMLSelectElement;
        expect(timezoneSelect.value).toBe('Asia/Saigon');
        expect(timezoneSelect.selectedOptions[0].textContent).toBe('Asia/Saigon');
    });

    it('falls back to Vietnam time when the browser zone is not in the list', () => {
        mockBrowserTimezones('Etc/Unknown', ['Africa/Abidjan', 'Asia/Ho_Chi_Minh']);

        render(<OnboardingIndex />);

        expect((screen.getByRole('combobox', { name: 'Timezone' }) as HTMLSelectElement).value).toBe('Asia/Ho_Chi_Minh');
    });

    it('submits without a website and marks the field as optional', () => {
        mockBrowserTimezones('Asia/Ho_Chi_Minh', ['Asia/Ho_Chi_Minh']);

        render(<OnboardingIndex />);
        expect(screen.getByText(/Optional/)).toBeInTheDocument();

        submit();

        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][0]).toBe('/app/accounts/7/onboarding');
        expect(postedFields()).toMatchObject({ website: '', timezone: 'Asia/Ho_Chi_Minh', locale: 'en' });
    });

    it('lets the website be typed straight away and sends it with a scheme', () => {
        mockBrowserTimezones('Asia/Ho_Chi_Minh', ['Asia/Ho_Chi_Minh']);

        render(<OnboardingIndex />);
        const websiteInput = screen.getByRole('textbox', { name: 'Website' });
        expect(websiteInput).not.toHaveAttribute('readonly');

        fireEvent.change(websiteInput, { target: { value: 'shophoa.vn' } });
        submit();

        expect(postedFields().website).toBe('https://shophoa.vn');
    });

    it('offers role, industry and source choices for Vietnamese online sellers and posts stable keys', () => {
        mockBrowserTimezones('Asia/Ho_Chi_Minh', ['Asia/Ho_Chi_Minh']);

        render(<OnboardingIndex />);

        const optionLabels = (name: string) =>
            Array.from((screen.getByRole('combobox', { name }) as HTMLSelectElement).options)
                .filter(option => option.value)
                .map(option => option.textContent);

        expect(optionLabels('Your Role')).toContain('Shop owner / business owner');
        expect(optionLabels('Industry')).toEqual(expect.arrayContaining(['Fashion', 'Mother & baby', 'Wholesale / distributor']));
        expect(optionLabels('Where did you find us?')).toEqual(
            expect.arrayContaining(['Zalo', 'Facebook', 'TikTok', 'Friend or partner referral']),
        );
        expect(optionLabels('Where did you find us?')).not.toContain('Reddit');

        fireEvent.change(screen.getByRole('combobox', { name: 'Your Role' }), { target: { value: 'owner' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Industry' }), { target: { value: 'mother_baby' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Where did you find us?' }), { target: { value: 'zalo' } });
        submit();

        expect(postedFields()).toMatchObject({ user_role: 'owner', industry: 'mother_baby', referral_source: 'zalo' });
    });

    it('builds the language list from the languages the server supports', () => {
        mockBrowserTimezones('Asia/Ho_Chi_Minh', ['Asia/Ho_Chi_Minh']);

        render(<OnboardingIndex />);

        const languageSelect = screen.getByRole('combobox', { name: 'Language' }) as HTMLSelectElement;
        expect(Array.from(languageSelect.options).map(option => option.value)).toEqual(['', 'en', 'vi']);
        expect(languageSelect.value).toBe('en');
    });

    it('leaves the language unset instead of posting one the server does not support', () => {
        mockBrowserTimezones('Asia/Ho_Chi_Minh', ['Asia/Ho_Chi_Minh']);
        account.locale = 'pt_BR';

        render(<OnboardingIndex />);
        submit();

        expect(postedFields().locale).toBe('');
    });
});
