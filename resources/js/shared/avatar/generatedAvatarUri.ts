import { blobatarUri } from 'blobatar/uri';

import { avatarExpression } from './avatarMood';

// Bản tĩnh của avatar hình khối cho trình xem phóng to: SVG nên nét ở mọi cỡ, cùng
// hình và cùng biểu cảm với avatar nhỏ của chủ thể đó.
export function generatedAvatarUri(identity: string, size: number): string {
    return blobatarUri(identity, { expression: avatarExpression(identity), background: 'square', size });
}
