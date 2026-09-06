import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';

// Port từ dashboard/api/mfa.js — nơi duy nhất biết đường dẫn endpoint MFA.
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

const URL = '/api/v1/profile/mfa';

export const mfaApi = {
    get: () => getJson<MfaStatus>(URL),
    enable: () => postJson<MfaSetupPayload>(URL, {}),
    verify: (otpCode: string) => postJson<{ enabled: boolean; backup_codes?: string[] }>(`${URL}/verify`, { otp_code: otpCode }),
    disable: (password: string, { otpCode = '', backupCode = '' }: { otpCode?: string; backupCode?: string }) =>
        deleteJson<{ enabled: boolean }>(URL, { password, otp_code: otpCode, backup_code: backupCode }),
    regenerateBackupCodes: (otpCode: string) =>
        postJson<{ backup_codes: string[] }>(`${URL}/backup_codes`, { otp_code: otpCode }),
};
