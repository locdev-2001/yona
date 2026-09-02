// Sinh bởi `php artisan i18n:generate` từ lang/{locale}/*.php — KHÔNG SỬA TAY.
import en from './en';

export const locales: Record<string, Record<string, unknown>> = {
    'en': en,
};

export const defaultLocale = 'en';
