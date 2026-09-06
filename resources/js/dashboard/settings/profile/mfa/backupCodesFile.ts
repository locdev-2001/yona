import { copyTextToClipboard } from 'shared/helpers/clipboard';

// Hai thao tác dùng chung cho cả bước cài đặt lẫn hộp thoại sinh lại mã.
export function copyBackupCodes(codes: string[]): Promise<void> {
    return copyTextToClipboard(codes.join('\n'));
}

export function downloadBackupCodes(codes: string[], installationName: string): void {
    const content = `${installationName} Two-Factor Authentication Backup Codes\n\n${codes.join('\n')}\n\nKeep these codes in a safe place.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${installationName.toLowerCase()}-backup-codes.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
}
