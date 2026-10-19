import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Icon from 'dashboard/components-next/icon/Icon';
import Input from 'dashboard/components-next/input/Input';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import OnboardingLayout from './shared/OnboardingLayout';
import OnboardingSection from './shared/OnboardingSection';
import OnboardingFormRow from './account-details/OnboardingFormRow';
import OnboardingFormSelect from './account-details/OnboardingFormSelect';
import {
    COMPANY_SIZE_OPTIONS,
    INDUSTRY_KEYS,
    REFERRAL_SOURCE_KEYS,
    USER_ROLE_KEYS,
    translatedOptions,
} from './shared/constants';
import { browserTimezone, defaultTimezone, supportedTimezones, timezoneOptions } from './shared/timezone';
import type { SharedPageProps } from '../../types';

interface OnboardingPageProps extends SharedPageProps {
    account: { id: number; name: string; locale: string; custom_attributes: Record<string, unknown> };
    languages: { name: string; iso_639_1_code: string }[];
}

// Port từ dashboard/routes/dashboard/onboarding/Index.vue
// (enrichment brand-info + bước inbox_setup là cloud-only — bỏ). Không trường nào
// bắt buộc: website chỉ cần cho inbox web-widget tự tạo của bước inbox_setup.
export default function OnboardingIndex() {
    const { auth, account, languages = [] } = usePage<OnboardingPageProps>().props;

    const { zoneOptions, initialTimezone } = useMemo(() => {
        const browserZone = browserTimezone();
        const options = timezoneOptions(supportedTimezones(), browserZone);
        return { zoneOptions: options, initialTimezone: defaultTimezone(options, browserZone) };
    }, []);
    const languageOptions = useMemo(
        () =>
            [...languages]
                .sort((a, b) => a.iso_639_1_code.localeCompare(b.iso_639_1_code))
                .map(language => ({ value: language.iso_639_1_code, label: language.name })),
        [languages],
    );

    const [businessName, setBusinessName] = useState(account.name);
    const [userRole, setUserRole] = useState('');
    const [website, setWebsite] = useState('');
    // Ngôn ngữ của account không nằm trong danh sách thì để trống (server giữ nguyên), không gửi giá trị server sẽ từ chối.
    const [locale, setLocale] = useState(() =>
        languageOptions.some(option => option.value === account.locale) ? account.locale : '',
    );
    const [timezone, setTimezone] = useState(initialTimezone);
    const [companySize, setCompanySize] = useState('');
    const [industry, setIndustry] = useState('');
    const [referralSource, setReferralSource] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);

    const userName = auth.user?.name || '';
    const userEmail = auth.user?.email || '';

    const normalizeWebsiteUrl = (raw: string) => {
        const trimmed = (raw || '').trim();
        if (!trimmed) return '';
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;

        setSubmitting(true);
        router.post(
            `/app/accounts/${account.id}/onboarding`,
            {
                name: businessName.trim(),
                locale,
                website: normalizeWebsiteUrl(website),
                industry,
                company_size: companySize,
                timezone,
                referral_source: referralSource,
                user_role: userRole,
            },
            {
                onError: () => useAlert(t('ONBOARDING_NEXT.ERROR')),
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <form onSubmit={handleSubmit}>
            <OnboardingLayout
                greeting={t('ONBOARDING_NEXT.GREETING', { name: userName })}
                subtitle={t('ONBOARDING_NEXT.SUBTITLE')}
                continueLabel={t('ONBOARDING_NEXT.CONTINUE')}
                isLoading={isSubmitting}
            >
                <OnboardingSection title={t('ONBOARDING_NEXT.YOUR_DETAILS')} icon="i-lucide-user">
                    <div className="flex items-center gap-2 px-3 py-3">
                        <Avatar seed={avatarSeed('user', auth.user?.id)} name={userName} size={16} roundedFull />
                        <span className="text-sm font-medium text-n-slate-12">{userName}</span>
                    </div>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.EMAIL')} icon="i-lucide-mail">
                        <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm text-n-slate-12">{userEmail}</span>
                            <Icon
                                icon="i-lucide-circle-check"
                                className="size-4 text-n-teal-11 flex-shrink-0"
                            />
                        </div>
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.YOUR_ROLE')} icon="i-lucide-user">
                        <OnboardingFormSelect
                            value={userRole}
                            onChange={setUserRole}
                            options={translatedOptions('USER_ROLE', USER_ROLE_KEYS)}
                            ariaLabel={t('ONBOARDING_NEXT.FIELDS.YOUR_ROLE')}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_ROLE')}
                        />
                    </OnboardingFormRow>
                </OnboardingSection>

                <OnboardingSection title={t('ONBOARDING_NEXT.COMPANY_DETAILS')} icon="i-lucide-briefcase-business">
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.BUSINESS_NAME')} icon="i-lucide-store">
                        <Input
                            type="text"
                            autoComplete="organization"
                            size="sm"
                            value={businessName}
                            onChange={event => setBusinessName(event.target.value)}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.ENTER_BUSINESS_NAME')}
                            aria-label={t('ONBOARDING_NEXT.FIELDS.BUSINESS_NAME')}
                            customInputClass="text-end"
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow
                        title={t('ONBOARDING_NEXT.FIELDS.WEBSITE')}
                        hint={t('ONBOARDING_NEXT.OPTIONAL')}
                        icon="i-lucide-globe"
                    >
                        <Input
                            type="text"
                            inputMode="url"
                            autoComplete="url"
                            size="sm"
                            value={website}
                            onChange={event => setWebsite(event.target.value)}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.ENTER_WEBSITE')}
                            aria-label={t('ONBOARDING_NEXT.FIELDS.WEBSITE')}
                            customInputClass="text-end"
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.LANGUAGE')} icon="i-lucide-languages">
                        <OnboardingFormSelect
                            value={locale}
                            onChange={setLocale}
                            options={languageOptions}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_LANGUAGE')}
                            ariaLabel={t('ONBOARDING_NEXT.FIELDS.LANGUAGE')}
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.TIMEZONE')} icon="i-lucide-clock">
                        <OnboardingFormSelect
                            value={timezone}
                            onChange={setTimezone}
                            options={zoneOptions}
                            ariaLabel={t('ONBOARDING_NEXT.FIELDS.TIMEZONE')}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_TIMEZONE')}
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.INDUSTRY')} icon="i-lucide-factory">
                        <OnboardingFormSelect
                            value={industry}
                            onChange={setIndustry}
                            options={translatedOptions('INDUSTRY', INDUSTRY_KEYS)}
                            ariaLabel={t('ONBOARDING_NEXT.FIELDS.INDUSTRY')}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_INDUSTRY')}
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.COMPANY_SIZE')} icon="i-lucide-users">
                        <OnboardingFormSelect
                            value={companySize}
                            onChange={setCompanySize}
                            options={COMPANY_SIZE_OPTIONS}
                            ariaLabel={t('ONBOARDING_NEXT.FIELDS.COMPANY_SIZE')}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_COMPANY_SIZE')}
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.REFERRAL_SOURCE')} icon="i-lucide-megaphone">
                        <OnboardingFormSelect
                            value={referralSource}
                            onChange={setReferralSource}
                            options={translatedOptions('REFERRAL_SOURCE', REFERRAL_SOURCE_KEYS)}
                            ariaLabel={t('ONBOARDING_NEXT.FIELDS.REFERRAL_SOURCE')}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_REFERRAL_SOURCE')}
                        />
                    </OnboardingFormRow>
                </OnboardingSection>
            </OnboardingLayout>
            <SnackbarContainer />
        </form>
    );
}
