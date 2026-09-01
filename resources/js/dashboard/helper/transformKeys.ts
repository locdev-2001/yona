// Port từ dashboard/composables/useTransformKeys.js — chuyển key sâu giữa
// snake_case (API Rails-shape) và camelCase (component), như camelcase-keys/
// snakecase-keys mà store Chatwoot dùng. stopPaths: giữ nguyên con của path đó
// (vd custom_attributes do người dùng tự đặt tên key).
type PlainObject = Record<string, unknown>;

const toCamel = (key: string) => key.replace(/_(\w)/g, (_, char: string) => char.toUpperCase());
const toSnake = (key: string) => key.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();

function isPlainObject(value: unknown): value is PlainObject {
    return typeof value === 'object' && value !== null && value.constructor === Object;
}

function transform(value: unknown, convert: (key: string) => string, stopPaths: string[], path: string): unknown {
    if (Array.isArray(value)) {
        return value.map(item => transform(item, convert, stopPaths, path));
    }
    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, child]) => {
                const childPath = path ? `${path}.${key}` : key;

                return [
                    convert(key),
                    stopPaths.includes(childPath) ? child : transform(child, convert, stopPaths, childPath),
                ];
            }),
        );
    }
    return value;
}

export function camelizeKeys<T>(value: unknown, stopPaths: string[] = []): T {
    return transform(value, toCamel, stopPaths, '') as T;
}

export function snakeizeKeys<T>(value: unknown, stopPaths: string[] = []): T {
    return transform(value, toSnake, stopPaths, '') as T;
}
