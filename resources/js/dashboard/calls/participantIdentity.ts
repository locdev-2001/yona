// Định danh người trong phòng do máy chủ dựng (`user:{id}`, `guest:{key}`): một chỗ đọc ở client.
const USER_PREFIX = 'user:';

export function userIdOfIdentity(identity: string): number | null {
    if (!identity.startsWith(USER_PREFIX)) return null;

    const userId = Number(identity.slice(USER_PREFIX.length));
    return Number.isInteger(userId) && userId > 0 ? userId : null;
}
