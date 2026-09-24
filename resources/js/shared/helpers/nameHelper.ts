// splitName của thư viện tiện ích dùng chung: tách "John Van Doe" → first "John", last "Van Doe".
export function splitName(name = ''): { firstName: string; lastName: string } {
    const [firstName = '', ...rest] = name.trim().split(/\s+/).filter(Boolean);

    return { firstName, lastName: rest.join(' ') };
}
