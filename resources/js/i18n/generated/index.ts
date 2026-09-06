// Sinh bởi `php artisan i18n:generate` từ lang/{locale}/*.php — KHÔNG SỬA TAY.
import en from './en';
import vi from './vi';

export const locales: Record<string, Record<string, unknown>> = {
    'en': en,
    'vi': vi,
};

export const defaultLocale = 'en';
