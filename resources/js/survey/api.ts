// Port từ survey/api/{endPoints,survey}.js — hai đường duy nhất của trang khảo
// sát công khai (không phiên, không token).
export interface SurveyDetails {
    id: number;
    csat_survey_response: { rating?: number | null; feedback_message?: string | null } | null;
    display_type: string;
    content: string | null;
    inbox_avatar_url: string;
    inbox_name: string;
    locale: string;
    conversation_id: number;
    created_at: string;
}

export interface SurveySubmission {
    rating: number;
    feedback_message: string;
}

const endpoint = (uuid: string) => `/public/api/v1/csat_survey/${uuid}`;

async function parse(response: Response): Promise<unknown> {
    const body = await response.text();
    const payload = body ? JSON.parse(body) : {};

    if (!response.ok) {
        throw new Error((payload as { error?: string; message?: string }).error ?? (payload as { message?: string }).message ?? '');
    }

    return payload;
}

export const getSurveyDetails = async (uuid: string): Promise<SurveyDetails> =>
    parse(await fetch(endpoint(uuid), { headers: { Accept: 'application/json' } })) as Promise<SurveyDetails>;

export const updateSurvey = async (uuid: string, submission: SurveySubmission): Promise<SurveyDetails> =>
    parse(
        await fetch(endpoint(uuid), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ message: { submitted_values: { csat_survey_response: submission } } }),
        }),
    ) as Promise<SurveyDetails>;
