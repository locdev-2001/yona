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

// Chuỗi lang bọc `@` trong literal kiểu vue-i18n: `example{'@'}companyname.com`.
// Không có cú pháp linked message, nhưng vẫn phải trả literal về ký tự thật —
// nếu không placeholder email hiện nguyên dấu ngoặc trước mặt người dùng.
function unescapeLiterals(message: string): string {
    return message.replace(/\{'([^']*)'\}/g, '$1');
}

// Chuỗi nói về chính sản phẩm viết `{installationName}` trong lang; t() tự điền
// cho mọi mặt tiền nên nơi gọi không phải truyền. Phía PHP cùng tên tham số ở
// App\Translation\Translator::INSTALLATION_NAME_PARAM.
export const INSTALLATION_NAME_PARAM = 'installationName';

const DEFAULT_INSTALLATION_NAME = 'Yona';
const INSTALLATION_NAME_PLACEHOLDER = `{${INSTALLATION_NAME_PARAM}}`;

// Tên đọc từ <html data-installation-name> — cùng đường mà locale đã đi, nên
// widget/portal/survey không phải nạp thêm gì.
function installationName(): string {
    if (typeof document === 'undefined') return DEFAULT_INSTALLATION_NAME;

    return document.documentElement.dataset.installationName || DEFAULT_INSTALLATION_NAME;
}

// Cho chuỗi không đi qua t() (mô tả tích hợp từ API, nhãn truyền vào component).
export function fillInstallationName(text: string, name: string = installationName()): string {
    return text.split(INSTALLATION_NAME_PLACEHOLDER).join(name);
}

// Tra key lồng nhau + nội suy {param}.
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

    // Nhánh số nhiều chọn theo `n`; nhiều chỗ gọi truyền `count`.
    const pluralCount = typeof params?.n === 'number' ? params.n : typeof params?.count === 'number' ? params.count : undefined;
    // Message có `|` LUÔN là message số nhiều; gọi không kèm số trả nhánh đầu
    // (số ít), không trả nguyên chuỗi kèm dấu gạch đứng.
    const replacements: Record<string, string | number> = { [INSTALLATION_NAME_PARAM]: installationName(), ...params };
    const result = pluralize(value, pluralCount ?? 1).replace(/\{(\w+)\}/g, (match, name: string) =>
        name in replacements ? String(replacements[name]) : match,
    );

    return unescapeLiterals(result);
}
