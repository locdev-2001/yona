import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';

// Port từ dashboard/api/mfa.js. createMfaApi nhận baseUrl để dùng chung cho cả
// MFA của agent (/api/v1/profile/mfa) và của super admin (/admin/mfa) —
// cùng ManagementService/AuthenticationService phía backend
// (App\Http\Controllers\Concerns\MfaEnrollmentActions), khác đường dẫn.
export interface MfaStatus {
    feature_available: boolean;
    enabled: boolean;
    backup_codes_generated: boolean;
    remaining_backup_codes: number;
}

export interface MfaSetupPayload {
    provisioning_url: string;
    secret: string;
}

export function createMfaApi(baseUrl: string) {
    return {
        get: () => getJson<MfaStatus>(baseUrl),
        enable: () => postJson<MfaSetupPayload>(baseUrl, {}),
        verify: (otpCode: string) =>
            postJson<{ enabled: boolean; backup_codes?: string[] }>(`${baseUrl}/verify`, { otp_code: otpCode }),
        disable: (password: string, { otpCode = '', backupCode = '' }: { otpCode?: string; backupCode?: string }) =>
            deleteJson<{ enabled: boolean }>(baseUrl, { password, otp_code: otpCode, backup_code: backupCode }),
        regenerateBackupCodes: (otpCode: string) =>
            postJson<{ backup_codes: string[] }>(`${baseUrl}/backup_codes`, { otp_code: otpCode }),
    };
}

export const mfaApi = createMfaApi('/api/v1/profile/mfa');
