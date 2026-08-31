import login from './locale/en/login.json';

const messages: Record<string, unknown> = {
    ...login,
    COMMON: {
        OR: 'Or',
    },
};

// Tương đương $t của vue-i18n bên Chatwoot (chỉ phần tra key lồng nhau
// mà các màn đã port cần; i18n đầy đủ + tiếng Việt vào ở nhóm G).
export function t(key: string): string {
    const value = key
        .split('.')
        .reduce<unknown>(
            (node, part) =>
                node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
            messages,
        );

    if (typeof value !== 'string') return key;

    // vue-i18n escape dạng {'@'} → @
    return value.replace(/\{'([^']*)'\}/g, '$1');
}
