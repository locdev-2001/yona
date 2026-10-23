import { useEffect, useState } from 'react';

export function usePreference<T>(name: string, initial: T, validate: (candidate: unknown) => candidate is T) {
    const [value, setValue] = useState<T>(() => {
        try {
            const saved: unknown = JSON.parse(localStorage.getItem(`yona-admin-preview:${name}`) ?? 'null');
            return validate(saved) ? saved : initial;
        } catch {
            return initial;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(`yona-admin-preview:${name}`, JSON.stringify(value));
        } catch {
            /* Bản xem trước vẫn dùng được khi trình duyệt chặn lưu trữ. */
        }
    }, [name, value]);
    return [value, setValue] as const;
}
