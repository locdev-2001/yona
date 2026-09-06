// Trạng thái của một phiếu khảo sát CSAT, đọc từ `content_attributes.submitted_values`
// của tin `input_csat`. Dùng chung cho bong bóng trong widget và trang khảo sát
// công khai — hai nơi lấy dữ liệu khác nguồn nhưng luật hiển thị giống hệt.
export interface CsatSurveyResponseValues {
    rating?: number | null;
    feedback_message?: string | null;
}

export function csatResponseFrom(submittedValues: unknown): CsatSurveyResponseValues | null {
    if (!submittedValues || typeof submittedValues !== 'object' || Array.isArray(submittedValues)) {
        return null;
    }

    const response = (submittedValues as { csat_survey_response?: unknown }).csat_survey_response;

    return response && typeof response === 'object' ? (response as CsatSurveyResponseValues) : null;
}

export const isCsatRatingSubmitted = (response: CsatSurveyResponseValues | null): boolean =>
    Boolean(response?.rating);

// Phản hồi đã gửi thì khoá cả điểm lẫn ô nhập; cờ `justSubmitted` để khoá ngay
// trong lượt hiện tại, không chờ dữ liệu quay về.
export const isCsatFeedbackSubmitted = (
    response: CsatSurveyResponseValues | null,
    justSubmitted = false,
): boolean => justSubmitted || Boolean(response?.feedback_message);

// Trang khảo sát công khai đọc uuid từ chính URL đang mở.
export const csatSurveyUuidFromUrl = (href: string): string =>
    href.split(/[?#]/)[0].replace(/\/+$/, '').split('/').pop() ?? '';
