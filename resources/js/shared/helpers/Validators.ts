// Port từ shared/helpers/Validators.js — chỉ những hàm bản port đang dùng
// (luật FormKit của form tiền chat + regex của thuộc tính tuỳ biến).

// Số điện thoại hợp lệ sau khi bỏ dấu '+': tối thiểu 5 chữ số, không bắt đầu bằng 0.
export const isPhoneNumberValidWithDialCode = (value: string): boolean =>
    !!value.replace(/^\+/, '').match(/^[1-9]\d{4,}$/);

export const startsWithPlus = (value: string): boolean => value.startsWith('+');

// Số E.164 đầy đủ (dùng cho form kênh Twilio/WhatsApp) — rỗng cũng hợp lệ.
export const isPhoneE164 = (value: string): boolean => !!value.match(/^\+[1-9]\d{1,14}$/);

export const isPhoneE164OrEmpty = (value: string): boolean => isPhoneE164(value) || value === '';

export const isNumber = (value: string): boolean => /^\d+$/.test(value);

// Chuỗi '/pattern/flags' do người dùng nhập ở màn thuộc tính tuỳ biến → RegExp.
export const getRegexp = (regexPatternValue: string): RegExp => {
    const lastSlash = regexPatternValue.lastIndexOf('/');

    return new RegExp(regexPatternValue.slice(1, lastSlash), regexPatternValue.slice(lastSlash + 1));
};

// Chuẩn hoá regex người dùng nhập về dạng chính tắc `/source/flags`; bỏ lớp
// `/.../flags` nếu đã có để `new RegExp` không escape lặp dấu gạch chéo.
export const normalizeRegexPattern = (pattern: string | null): string | null => {
    if (!pattern) return null;
    const match = pattern.match(/^\/(.+)\/([gimsuy]*)$/);

    return new RegExp(match ? match[1] : pattern, match ? match[2] : '').toString();
};
