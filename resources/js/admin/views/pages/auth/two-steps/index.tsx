import type { ReactNode } from 'react';
import useThemeConfig from '@admin/configs/themeConfig';
import AuthPanel from '../auth-panel';
import { AuthBrand, AuthStage } from '../../../../../superadmin/design-preview/auth-stage';
type Props = { title: string; description: ReactNode; children: ReactNode; className?: string; };
export default function AuthScreen({ title, description, children, className }: Props) {
    const branding = useThemeConfig();
    return <AuthStage fullScreen><AuthPanel embedded title={title} description={description} className={className} branding={<AuthBrand logo={branding.logo} label={branding.templateName} href="/" />}>{children}</AuthPanel></AuthStage>;
}
