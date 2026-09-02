import { locales, defaultLocale } from './generated';

// Nguồn chân lý = lang/{locale}/*.php; bundle trong ./generated do `php artisan i18n:generate` sinh.
const messages = locales[defaultLocale];

// vue-i18n implicit plural: message dạng "a | b" (hoặc 3 nhánh zero|one|other)
// chọn nhánh theo named param `n`.
function pluralize(message: string, count: number): string {
    const choices = message.split('|').map(choice => choice.trim());
    if (choices.length < 2) return message;
    if (choices.length === 2) return count === 1 ? choices[0] : choices[1];

    return count === 0 ? choices[0] : count === 1 ? choices[1] : choices[2];
}

// Tương đương $t của vue-i18n bên Chatwoot: tra key lồng nhau + nội suy {param}.
export function t(key: string, params?: Record<string, string | number>): string {
    const value = key
        .split('.')
        .reduce<unknown>(
            (node, part) =>
                node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
            messages,
        );

    if (typeof value !== 'string') return key;

    let result = value;
    if (typeof params?.n === 'number') {
        result = pluralize(result, params.n);
    }
    if (params) {
        result = result.replace(/\{(\w+)\}/g, (match, name: string) =>
            name in params ? String(params[name]) : match,
        );
    }
    return result;
}
