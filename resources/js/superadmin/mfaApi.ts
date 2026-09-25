import { getJson, postJson } from 'dashboard/helper/apiClient';

// Port từ dashboard/settings/profile/mfa/mfaApi.ts cho guard `super_admin` —
// cùng ManagementService/AuthenticationService phía backend
// (App\Http\Controllers\Concerns\MfaEnrollmentActions), khác đường dẫn.
export interface SuperAdminMfaStatus {
    feature_available: boolean;
    enabled: boolean;
    backup_codes_generated: boolean;
    remaining_backup_codes: number;
}

export interface SuperAdminMfaSetupPayload {
    provisioning_url: string;
    secret: string;
}

const URL = '/super_admin/mfa';

export const superAdminMfaApi = {
    get: () => getJson<SuperAdminMfaStatus>(URL),
    enable: () => postJson<SuperAdminMfaSetupPayload>(URL, {}),
    verify: (otpCode: string) =>
        postJson<{ enabled: boolean; backup_codes?: string[] }>(`${URL}/verify`, { otp_code: otpCode }),
};
