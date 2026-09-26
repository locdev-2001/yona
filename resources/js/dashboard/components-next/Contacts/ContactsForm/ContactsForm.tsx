import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import countries from 'shared/constants/countries';
import { splitName } from 'shared/helpers/nameHelper';
import Input from 'dashboard/components-next/input/Input';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import Icon from 'dashboard/components-next/icon/Icon';
import PhoneNumberInput from 'dashboard/components-next/phonenumberinput/PhoneNumberInput';
import type { Contact, ContactFormState } from 'dashboard/contacts/types';

// Port từ dashboard/components-next/Contacts/ContactsForm/ContactsForm.vue.
// CompanySelector (feature companies = EE) không port — nhánh else Input
// COMPANY_NAME của bản gốc chạy khi feature tắt.
const FORM_CONFIG: Record<string, { field: string }> = {
    FIRST_NAME: { field: 'firstName' },
    LAST_NAME: { field: 'lastName' },
    EMAIL_ADDRESS: { field: 'email' },
    PHONE_NUMBER: { field: 'phoneNumber' },
    CITY: { field: 'additionalAttributes.city' },
    COUNTRY: { field: 'additionalAttributes.countryCode' },
    BIO: { field: 'additionalAttributes.description' },
    COMPANY_NAME: { field: 'additionalAttributes.companyName' },
};

const SOCIAL_CONFIG: Record<string, string> = {
    LINKEDIN: 'i-ri-linkedin-box-fill',
    FACEBOOK: 'i-ri-facebook-circle-fill',
    INSTAGRAM: 'i-ri-instagram-line',
    TELEGRAM: 'i-ri-telegram-fill',
    TIKTOK: 'i-ri-tiktok-fill',
    TWITTER: 'i-ri-twitter-x-fill',
    GITHUB: 'i-ri-github-fill',
};

// Validator email của vuelidate (rút gọn): bỏ qua khi rỗng.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createDefaultState = (): ContactFormState => ({
    id: 0,
    name: '',
    email: '',
    companyId: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    additionalAttributes: {
        description: '',
        companyName: '',
        countryCode: '',
        country: '',
        city: '',
        socialProfiles: {
            facebook: '',
            github: '',
            instagram: '',
            telegram: '',
            tiktok: '',
            linkedin: '',
            twitter: '',
        },
    },
});

function stateFromContact(contact: Partial<Contact> | null): ContactFormState {
    const {
        id = 0,
        name = '',
        email: emailAddress,
        phoneNumber,
        companyId = '',
        additionalAttributes = {},
    } = contact || {};
    const { firstName, lastName } = splitName(name || '');
    const {
        description = '',
        companyName = '',
        countryCode = '',
        country = '',
        city = '',
        socialTelegramUserName = '',
        socialProfiles = {},
    } = additionalAttributes || {};

    const telegramUsername = socialProfiles?.telegram || socialTelegramUserName || '';
    const defaults = createDefaultState();

    return {
        id,
        name: name || '',
        companyId: companyId || '',
        firstName,
        lastName,
        email: emailAddress || '',
        phoneNumber: phoneNumber || '',
        additionalAttributes: {
            description,
            companyName,
            countryCode,
            country,
            city,
            socialProfiles: {
                ...defaults.additionalAttributes.socialProfiles,
                ...socialProfiles,
                telegram: telegramUsername,
            },
        },
    };
}

export interface ContactsFormHandle {
    getState: () => ContactFormState;
    resetForm: () => void;
    resetValidation: () => void;
}

interface ContactsFormProps {
    contactData?: Partial<Contact> | null;
    isDetailsView?: boolean;
    isNewContact?: boolean;
    onUpdate: (state: ContactFormState) => void;
    onValidityChange?: (isInvalid: boolean) => void;
}

const ContactsForm = forwardRef<ContactsFormHandle, ContactsFormProps>(function ContactsForm(
    { contactData = null, isDetailsView = false, isNewContact = false, onUpdate, onValidityChange },
    ref,
) {
    const [state, setState] = useState<ContactFormState>(() =>
        isNewContact ? createDefaultState() : stateFromContact(contactData),
    );
    const [touched, setTouched] = useState<{ firstName: boolean; email: boolean }>({
        firstName: false,
        email: false,
    });
    const stateRef = useRef(state);
    stateRef.current = state;

    // watch contactData.id { immediate: true } của bản gốc.
    const contactId = contactData?.id;
    useEffect(() => {
        if (!isNewContact && contactId) {
            setState(stateFromContact(contactData));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contactId, isNewContact]);

    const isFirstNameInvalid = (candidate: ContactFormState) => !candidate.firstName.trim();
    const isEmailInvalid = (candidate: ContactFormState) =>
        candidate.email !== '' && !EMAIL_REGEX.test(candidate.email);
    const isFormInvalid = isFirstNameInvalid(state) || isEmailInvalid(state);

    useEffect(() => {
        onValidityChange?.(isFormInvalid);
    }, [isFormInvalid, onValidityChange]);

    useImperativeHandle(ref, () => ({
        getState: () => stateRef.current,
        resetForm: () => {
            setState(createDefaultState());
            setTouched({ firstName: false, email: false });
        },
        resetValidation: () => setTouched({ firstName: false, email: false }),
    }));

    // emitContactUpdate: chỉ emit khi form hợp lệ, bỏ firstName/lastName.
    const emitContactUpdate = (nextState: ContactFormState) => {
        if (isFirstNameInvalid(nextState) || isEmailInvalid(nextState)) return;

        const { firstName, lastName, ...stateWithoutNames } = nextState;
        onUpdate(stateWithoutNames as ContactFormState);
    };

    const getFieldValue = (field: string): string => {
        if (field === 'firstName' || field === 'lastName') return state[field] ?? '';

        const [base, nested] = field.split('.');
        if (nested) {
            return String(
                (state.additionalAttributes as Record<string, unknown>)[nested] ?? '',
            );
        }
        return String((state as unknown as Record<string, unknown>)[base] ?? '');
    };

    const setFieldValue = (field: string, value: string) => {
        setState(current => {
            let next: ContactFormState;

            if (field === 'firstName' || field === 'lastName') {
                next = { ...current, [field]: value };
                next.name = `${next.firstName} ${next.lastName}`.trim();
            } else {
                const [base, nested] = field.split('.');
                next = nested
                    ? {
                          ...current,
                          additionalAttributes: { ...current.additionalAttributes, [nested]: value },
                      }
                    : ({ ...current, [base]: value } as ContactFormState);
            }

            emitContactUpdate(next);
            return next;
        });
    };

    const handleCountrySelection = (value: string) => {
        const selectedCountry = countries.find(option => option.id === value);

        setState(current => {
            const next = {
                ...current,
                additionalAttributes: {
                    ...current.additionalAttributes,
                    countryCode: value,
                    country: selectedCountry?.name || '',
                },
            };

            // handleCountrySelection của bản gốc emit thẳng state đầy đủ.
            onUpdate(next);
            return next;
        });
    };

    const handleSocialInput = (key: string, value: string) => {
        setState(current => {
            const next = {
                ...current,
                additionalAttributes: {
                    ...current.additionalAttributes,
                    socialProfiles: {
                        ...current.additionalAttributes.socialProfiles,
                        [key]: value,
                    },
                },
            };

            onUpdate(next);
            return next;
        });
    };

    const countryOptions = countries.map(({ name, id }) => ({ label: name, value: id }));

    const isValidationField = (key: string) => ['firstName', 'email'].includes(FORM_CONFIG[key].field);

    const hasFieldError = (key: string): boolean => {
        const field = FORM_CONFIG[key].field;
        if (field === 'firstName') return touched.firstName && isFirstNameInvalid(state);
        if (field === 'email') return touched.email && isEmailInvalid(state);
        return false;
    };

    const touchField = (key: string) => {
        const field = FORM_CONFIG[key].field;
        if (field === 'firstName' || field === 'email') {
            setTouched(current => ({ ...current, [field]: true }));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start gap-2">
                <span className="py-1 text-sm font-medium text-n-slate-12">
                    {t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.TITLE')}
                </span>
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                    {Object.keys(FORM_CONFIG).map(key => {
                        const placeholder = t(`CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.FORM.${key}.PLACEHOLDER`);

                        if (key === 'COUNTRY') {
                            return (
                                <ComboBox
                                    key={key}
                                    value={state.additionalAttributes.countryCode}
                                    options={countryOptions}
                                    placeholder={placeholder}
                                    className={[
                                        '[&>div>button]:h-8',
                                        !isDetailsView
                                            ? '[&>div>button]:bg-n-alpha-black2 [&>div>button:not(.focused)]:!outline-transparent'
                                            : '[&>div>button]:!bg-n-alpha-black2',
                                    ].join(' ')}
                                    onChange={handleCountrySelection}
                                />
                            );
                        }

                        if (key === 'PHONE_NUMBER') {
                            return (
                                <PhoneNumberInput
                                    key={key}
                                    value={state.phoneNumber}
                                    placeholder={placeholder}
                                    showBorder={isDetailsView}
                                    onChange={value => setFieldValue('phoneNumber', value)}
                                />
                            );
                        }

                        return (
                            <Input
                                key={key}
                                value={getFieldValue(FORM_CONFIG[key].field)}
                                placeholder={placeholder}
                                messageType={hasFieldError(key) ? 'error' : 'info'}
                                customInputClass={`h-8 !pt-1 !pb-1 ${
                                    !isDetailsView ? '[&:not(.error,.focus)]:!outline-transparent' : ''
                                }`}
                                className="w-full"
                                onChange={event => {
                                    setFieldValue(FORM_CONFIG[key].field, event.target.value);
                                    if (isValidationField(key)) touchField(key);
                                }}
                                onBlur={() => {
                                    if (isValidationField(key)) touchField(key);
                                }}
                            />
                        );
                    })}
                </div>
            </div>
            <div className="flex flex-col items-start gap-2">
                <span className="py-1 text-sm font-medium text-n-slate-12">
                    {t('CONTACTS_LAYOUT.CARD.SOCIAL_MEDIA.TITLE')}
                </span>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(SOCIAL_CONFIG).map(([key, icon]) => {
                        const placeholder = t(`CONTACTS_LAYOUT.CARD.SOCIAL_MEDIA.FORM.${key}.PLACEHOLDER`);
                        const socialKey = key.toLowerCase() as keyof ContactFormState['additionalAttributes']['socialProfiles'];

                        return (
                            <div key={key} className="flex items-center h-8 gap-2 px-2 rounded-lg bg-n-alpha-2">
                                <Icon icon={icon} className="flex-shrink-0 text-n-slate-11 size-4" />
                                <input
                                    value={state.additionalAttributes.socialProfiles[socialKey]}
                                    className="w-auto min-w-[100px] text-sm bg-transparent outline-none reset-base text-n-slate-12 placeholder:text-n-slate-10"
                                    placeholder={placeholder}
                                    size={placeholder.length}
                                    onChange={event => handleSocialInput(socialKey, event.target.value)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default ContactsForm;
