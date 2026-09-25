// Luật email/mật khẩu dùng chung cho mọi lối tạo tài khoản (đăng ký công khai,
// tham gia qua link mời) — cùng độ phức tạp mật khẩu với `User::passwordRules()`
// ở backend.
export const MIN_PASSWORD_LENGTH = 6;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|'"/\\.,`<>:;?~]/;

export const isValidPassword = (value: string) =>
    /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && SPECIAL_CHAR_REGEX.test(value);
