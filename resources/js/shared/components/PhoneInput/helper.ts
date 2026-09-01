import { getPhoneCodeByTimezone } from 'timezone-phone-codes';
import ct from 'countries-and-timezones';

// Port từ shared/components/PhoneInput/helper.js.
const getTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function getActiveDialCode(): string {
    return getPhoneCodeByTimezone(getTimezone()) || '';
}

export function getActiveCountryCode(): string {
    return ct.getCountryForTimezone(getTimezone())?.id || '';
}
