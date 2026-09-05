// Port từ dashboard/routes/dashboard/settings/labels/validations.js.
// `validLabelCharacters` của bản gốc chỉ chặn dấu cách; ở đây dùng thẳng regex
// của model Label (lib/regex_helper.rb) để thông báo lỗi đúng như chữ nó nói.
const LABEL_TITLE_PATTERN = /^[\p{L}\p{N}]+[\p{L}\p{N}_-]+$/u;

export const MIN_LABEL_TITLE_LENGTH = 2;

// Label API chỉ nhận chữ thường — cả ô nhập lẫn payload đều hạ trước.
export const normalizeLabelTitle = (title: string) => title.toLowerCase();

export const validLabelCharacters = (title = '') => LABEL_TITLE_PATTERN.test(title);

export function getLabelTitleErrorMessageKey(title: string): string {
    if (!title) return 'LABEL_MGMT.FORM.NAME.REQUIRED_ERROR';
    if (title.length < MIN_LABEL_TITLE_LENGTH) return 'LABEL_MGMT.FORM.NAME.MINIMUM_LENGTH_ERROR';
    if (!validLabelCharacters(title)) return 'LABEL_MGMT.FORM.NAME.VALID_ERROR';

    return '';
}

export const isLabelTitleInvalid = (title: string) => getLabelTitleErrorMessageKey(title) !== '';
