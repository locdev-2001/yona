import { happy, idle, love, shy, sleepy, smug, surprised, wink } from 'blobatar/expression';

// Chỉ biểu cảm thân thiện: avatar đứng cho khách và đồng nghiệp, không ai muốn mình
// hiện ra với mặt giận, buồn hay ốm.
const FRIENDLY_EXPRESSIONS = [idle, happy, wink, smug, love, shy, surprised, sleepy];

type AvatarExpression = (typeof FRIENDLY_EXPRESSIONS)[number];

// FNV-1a: cùng danh tính luôn ra cùng biểu cảm ở mọi màn, mọi lần tải.
function hashIdentity(identity: string): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < identity.length; index++) {
        hash ^= identity.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

export function avatarExpression(identity: string): AvatarExpression {
    return FRIENDLY_EXPRESSIONS[hashIdentity(identity) % FRIENDLY_EXPRESSIONS.length];
}
