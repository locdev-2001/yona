// Thẻ hồ sơ công khai của một người dùng (UserDirectory::card ở máy chủ).
export interface Person {
    id: number;
    name: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
}
