import login from './locale/en/login.json';
import signup from './locale/en/signup.json';
import onboarding from './locale/en/onboarding.json';
import setNewPassword from './locale/en/setNewPassword.json';
import settings from './locale/en/settings.json';
import components from './locale/en/components.json';

const messages: Record<string, unknown> = {
    ...login,
    ...signup,
    ...onboarding,
    ...setNewPassword,
    ...settings,
    ...components,
    COMMON: {
        OR: 'Or',
    },
};

// Tương đương $t của vue-i18n bên Chatwoot (chỉ phần tra key lồng nhau
// mà các màn đã port cần; i18n đầy đủ + tiếng Việt vào ở nhóm G).
export function t(key: string, params?: Record<string, string | number>): string {
    const value = key
        .split('.')
        .reduce<unknown>(
            (node, part) =>
                node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
            messages,
        );

    if (typeof value !== 'string') return key;

    // vue-i18n escape dạng {'@'} → @, và nội suy {param}
    let result = value.replace(/\{'([^']*)'\}/g, '$1');
    if (params) {
        result = result.replace(/\{(\w+)\}/g, (match, name: string) =>
            name in params ? String(params[name]) : match,
        );
    }
    return result;
}
