import { locales, defaultLocale } from './generated';

// Nguồn chân lý = lang/{locale}/*.php; bundle trong ./generated do `php artisan i18n:generate` sinh.
// Locale của lần render này do máy chủ quyết (middleware SetLocale) và in ra ở
// thẻ <html lang>; mọi mặt tiền (dashboard, widget, portal, survey) đọc chung chỗ đó.
function localeFromDocument(): string {
    if (typeof document === 'undefined') return defaultLocale;
    const declared = document.documentElement.lang.replace('-', '_');

    return declared in locales ? declared : defaultLocale;
}

let activeLocale = localeFromDocument();
let messages = locales[activeLocale];

export function getLocale(): string {
    return activeLocale;
}

export function setLocale(locale: string): void {
    const normalized = locale.replace('-', '_');
    if (!(normalized in locales)) return;
    activeLocale = normalized;
    messages = locales[normalized];
    if (typeof document !== 'undefined') {
        document.documentElement.lang = normalized.replace('_', '-');
    }
}

// vue-i18n implicit plural: message dạng "a | b" (hoặc 3 nhánh zero|one|other)
// chọn nhánh theo named param `n`.
function pluralize(message: string, count: number): string {
    const choices = message.split('|').map(choice => choice.trim());
    if (choices.length < 2) return message;
    if (choices.length === 2) return count === 1 ? choices[0] : choices[1];

    return count === 0 ? choices[0] : count === 1 ? choices[1] : choices[2];
}

// vue-i18n coi `@` là ký tự đặc biệt (linked message) nên chuỗi gốc Chatwoot bọc
// nó trong literal: `example{'@'}companyname.com`. Bản port không có cú pháp
// liên kết đó, nhưng vẫn phải trả literal về ký tự thật — nếu không placeholder
// email hiện nguyên dấu ngoặc trước mặt người dùng.
function unescapeLiterals(message: string): string {
    return message.replace(/\{'([^']*)'\}/g, '$1');
}

// Chuỗi gốc Chatwoot dùng chính chữ "Chatwoot" làm chỗ trống cho tên cài đặt;
// bản gốc thay nó ở từng nơi gọi (useBranding.replaceInstallationName), nên màn
// nào quên gọi là tên "Chatwoot" lọt thẳng ra trước mặt người dùng. Thay ở đây,
// một lần, cho mọi mặt tiền. Tên đọc từ <html data-installation-name> — cùng
// đường mà locale đã đi, nên widget/portal/survey không phải nạp thêm gì.
function installationName(): string {
    if (typeof document === 'undefined') return 'Yona';

    return document.documentElement.dataset.installationName || 'Yona';
}

// Tương đương $t của vue-i18n bên Chatwoot: tra key lồng nhau + nội suy {param}.
export function t(key: string, params?: Record<string, string | number>): string {
    const lookup = (source: Record<string, unknown>): unknown =>
        key
            .split('.')
            .reduce<unknown>(
                (node, part) =>
                    node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
                source,
            );

    // Locale thiếu chuỗi (chỉ xảy ra khi bundle cũ) vẫn hiện tiếng Anh, không hiện key thô.
    const value = lookup(messages) ?? (activeLocale === defaultLocale ? undefined : lookup(locales[defaultLocale]));

    if (typeof value !== 'string') return key;

    let result = value;
    // vue-i18n chọn nhánh số nhiều theo `n`; Chatwoot nhiều chỗ truyền `count`.
    const pluralCount = typeof params?.n === 'number' ? params.n : typeof params?.count === 'number' ? params.count : undefined;
    // vue-i18n: message có `|` LUÔN là message số nhiều; `$t(key)` không kèm số
    // trả nhánh đầu (số ít), không trả nguyên chuỗi kèm dấu gạch đứng.
    result = pluralize(result, pluralCount ?? 1);
    if (params) {
        result = result.replace(/\{(\w+)\}/g, (match, name: string) =>
            name in params ? String(params[name]) : match,
        );
    }

    return unescapeLiterals(result).replace(/Chatwoot/g, installationName());
}
