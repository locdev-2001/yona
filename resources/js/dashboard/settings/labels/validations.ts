// Port từ dashboard/routes/dashboard/settings/labels/validations.js.
// Label là tên hiển thị tự do: giữ chữ hoa, dấu tiếng Việt, khoảng trắng và
// ký hiệu. Chỉ chặn xuống dòng vì input/chip hiển thị trên một dòng.
const LABEL_TITLE_PATTERN = /^[^\r\n]+$/u;

export const MIN_LABEL_TITLE_LENGTH = 2;

// Chỉ cắt khoảng trắng hai đầu; không biến tên hiển thị thành slug.
export const normalizeLabelTitle = (title: string) => title.trim();

export const validLabelCharacters = (title = '') => LABEL_TITLE_PATTERN.test(normalizeLabelTitle(title));

export function getLabelTitleErrorMessageKey(title: string): string {
    const normalizedTitle = normalizeLabelTitle(title);
    if (!normalizedTitle) return 'LABEL_MGMT.FORM.NAME.REQUIRED_ERROR';
    if ([...normalizedTitle].length < MIN_LABEL_TITLE_LENGTH) {
        return 'LABEL_MGMT.FORM.NAME.MINIMUM_LENGTH_ERROR';
    }
    if (!validLabelCharacters(normalizedTitle)) return 'LABEL_MGMT.FORM.NAME.VALID_ERROR';

    return '';
}

export const isLabelTitleInvalid = (title: string) => getLabelTitleErrorMessageKey(title) !== '';
