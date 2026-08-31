import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Icon from 'dashboard/components-next/icon/Icon';
import NextButton from 'dashboard/components-next/button/Button';
import InlineInput from 'dashboard/components-next/inline-input/InlineInput';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import OnboardingLayout from './shared/OnboardingLayout';
import OnboardingSection from './shared/OnboardingSection';
import OnboardingFormRow from './account-details/OnboardingFormRow';
import OnboardingFormSelect from './account-details/OnboardingFormSelect';
import {
    COMPANY_SIZE_OPTIONS,
    INDUSTRY_OPTIONS,
    REFERRAL_SOURCE_OPTIONS,
    USER_ROLE_OPTIONS,
} from './shared/constants';
import type { SharedPageProps } from '../../types';

interface OnboardingPageProps extends SharedPageProps {
    account: { id: number; name: string; locale: string; custom_attributes: Record<string, unknown> };
}

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Tiếng Việt' },
];

// Port từ dashboard/routes/dashboard/onboarding/Index.vue
// (enrichment brand-info + bước inbox_setup là cloud-only — bỏ).
export default function OnboardingIndex() {
    const { auth, account } = usePage<OnboardingPageProps>().props;

    const [userRole, setUserRole] = useState('');
    const [website, setWebsite] = useState('');
    const [locale, setLocale] = useState(account.locale || '');
    const [timezone, setTimezone] = useState('');
    const [companySize, setCompanySize] = useState('');
    const [industry, setIndustry] = useState('');
    const [referralSource, setReferralSource] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);
    const [isEditingWebsite, setEditingWebsite] = useState(false);
    const [showErrorOnFields, setShowErrorOnFields] = useState(false);
    const websiteInput = useRef<HTMLInputElement>(null);

    const userName = auth.user?.name || '';
    const userEmail = auth.user?.email || '';

    const timezoneOptions = (() => {
        try {
            return Intl.supportedValuesOf('timeZone').map(tz => ({ value: tz, label: tz.replace(/_/g, ' ') }));
        } catch {
            return [];
        }
    })();

    const enableWebsiteEditing = () => {
        setEditingWebsite(true);
        window.setTimeout(() => websiteInput.current?.focus(), 0);
    };

    const normalizeWebsiteUrl = (raw: string) => {
        const trimmed = (raw || '').trim();
        if (!trimmed) return '';
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;

        if (!website.trim()) {
            useAlert(t('ONBOARDING_NEXT.VALIDATION_ERROR'));
            setShowErrorOnFields(true);
            window.setTimeout(() => setShowErrorOnFields(false), 600);
            enableWebsiteEditing();
            return;
        }

        setSubmitting(true);
        router.post(
            `/app/accounts/${account.id}/onboarding`,
            {
                name: account.name,
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
                        <Avatar name={userName} size={16} roundedFull />
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
                            options={USER_ROLE_OPTIONS}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_ROLE')}
                        />
                    </OnboardingFormRow>
                </OnboardingSection>

                <OnboardingSection title={t('ONBOARDING_NEXT.COMPANY_DETAILS')} icon="i-lucide-briefcase-business">
                    <div className="flex items-center gap-2 px-3 py-3">
                        <span className="text-sm font-medium text-n-slate-12">{account.name}</span>
                    </div>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.WEBSITE')} icon="i-lucide-globe">
                        <div className="flex items-center justify-end gap-2">
                            <InlineInput
                                ref={websiteInput}
                                value={website}
                                onChange={event => setWebsite(event.target.value)}
                                readOnly={!isEditingWebsite}
                                placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.ENTER_WEBSITE')}
                                customInputClass={[
                                    'w-auto text-end px-1 py-0.5 -my-0.5 mx-0 placeholder:text-n-slate-9 rounded',
                                    showErrorOnFields ? 'animate-shake' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                onEnterPress={() => websiteInput.current?.blur()}
                                onBlur={() => setEditingWebsite(false)}
                            />
                            <NextButton type="button" icon="i-lucide-pencil" slate xs ghost onClick={enableWebsiteEditing} />
                        </div>
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.LANGUAGE')} icon="i-lucide-languages">
                        <OnboardingFormSelect value={locale} onChange={setLocale} options={LANGUAGE_OPTIONS} />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.TIMEZONE')} icon="i-lucide-clock">
                        <OnboardingFormSelect
                            value={timezone}
                            onChange={setTimezone}
                            options={timezoneOptions}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_TIMEZONE')}
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.INDUSTRY')} icon="i-lucide-factory">
                        <OnboardingFormSelect
                            value={industry}
                            onChange={setIndustry}
                            options={INDUSTRY_OPTIONS}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_INDUSTRY')}
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.COMPANY_SIZE')} icon="i-lucide-users">
                        <OnboardingFormSelect
                            value={companySize}
                            onChange={setCompanySize}
                            options={COMPANY_SIZE_OPTIONS}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_COMPANY_SIZE')}
                        />
                    </OnboardingFormRow>
                    <OnboardingFormRow title={t('ONBOARDING_NEXT.FIELDS.REFERRAL_SOURCE')} icon="i-lucide-megaphone">
                        <OnboardingFormSelect
                            value={referralSource}
                            onChange={setReferralSource}
                            options={REFERRAL_SOURCE_OPTIONS}
                            placeholder={t('ONBOARDING_NEXT.PLACEHOLDERS.SELECT_REFERRAL_SOURCE')}
                        />
                    </OnboardingFormRow>
                </OnboardingSection>
            </OnboardingLayout>
            <SnackbarContainer />
        </form>
    );
}
