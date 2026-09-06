// Port từ widget/helpers/utils.js + widget/helpers/uuid.js.

export const isEmptyObject = (obj: unknown): boolean => {
    if (!obj) return true;
    return Object.keys(obj as object).length === 0 && (obj as object).constructor === Object;
};

export const groupBy = <T>(array: T[], predicate: (item: T) => string): Record<string, T[]> =>
    array.reduce<Record<string, T[]>>((acc, value) => {
        const key = predicate(value);
        (acc[key] ||= []).push(value);
        return acc;
    }, {});

export const getUuid = (): string =>
    'xxxxxxxx4xxx'.replace(/[xy]/g, character => {
        const random = (Math.random() * 16) | 0;
        const value = character === 'x' ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
