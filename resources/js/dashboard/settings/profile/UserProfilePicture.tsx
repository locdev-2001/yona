import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';

// Port từ dashboard/routes/dashboard/settings/profile/UserProfilePicture.vue
interface UserProfilePictureProps {
    src?: string;
    name?: string;
    // Định danh bền (avatarSeed) cho avatar hình khối khi chưa có ảnh.
    seed?: string;
    onChange: (payload: { file: File; url: string | null }) => void;
    onDelete: () => void;
}

export default function UserProfilePicture({ src = '', name = '', seed, onChange, onDelete }: UserProfilePictureProps) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-n-slate-12">{t('PROFILE_SETTINGS.FORM.PICTURE')}</span>
            <Avatar src={src} name={name} seed={seed} size={72} allowUpload onUpload={onChange} onDelete={onDelete} />
        </div>
    );
}
