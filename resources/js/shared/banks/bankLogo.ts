// Logo tự host theo BIN, đủ mọi ngân hàng của api.vietqr.io/v2/banks (cắt viền, thu về 320px).
const BANK_LOGO_DIR = '/bank-logos';

export function bankLogoUrl(bankBin?: string | null): string | undefined {
    return bankBin ? `${BANK_LOGO_DIR}/${bankBin}.png` : undefined;
}
