import { useState } from 'react';
import { ShieldCheck } from '@admin/components/icons';
import AuthPanel from '@admin/views/pages/auth/auth-panel';
import LoginForm from '@admin/views/pages/auth/login/login-form';
import { AuthBrand, AuthStage } from './auth-stage';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@admin/components/ui/input-otp';
import { Field, FieldGroup, FieldLabel } from '@admin/components/ui/field';
import { PreviewButton, SegmentedControl } from './components';
import type { PreviewTheme } from './tokens';
import '../resource/resources.css';
import './auth-screens.css';

export function AuthScreensDemo() {
    const [screen, setScreen] = useState<'login' | 'mfa'>('login');
    const [theme, setTheme] = useState<PreviewTheme>('dark');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return <div className="console-auth-gallery">
        <p className="catalogue-hint">Đã duyệt bản sáng và tối · dùng chung bố cục và form với màn đăng nhập thực tế.</p>
        <div className="auth-preview-controls"><SegmentedControl label="Màn xác thực" value={screen} onChange={setScreen} options={['login', 'mfa'] as const} getLabel={option => option === 'login' ? 'Đăng nhập' : 'Xác thực hai lớp'} /><SegmentedControl label="Giao diện mẫu xác thực" value={theme} onChange={setTheme} options={['dark', 'light'] as const} getLabel={option => option === 'dark' ? 'Tối' : 'Sáng'} /></div>
        <AuthStage theme={theme}>
            <AuthPanel embedded title={screen === 'login' ? 'Chào mừng trở lại' : 'Xác thực hai lớp'} description={screen === 'login' ? 'Đăng nhập vào bảng quản trị Yona' : 'Quét mã và nhập mã từ ứng dụng xác thực'} branding={<AuthBrand logo="/brand-assets/logo_thumbnail.png" label="Yona" />}>
                {screen === 'login' ? <LoginForm autoFocus={false} email={email} password={password} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={() => {}} labels={{email:'Email', emailPlaceholder:'Địa chỉ email', password:'Mật khẩu', submit:'Đăng nhập', showPassword:'Hiện mật khẩu', hidePassword:'Ẩn mật khẩu'}} /> : <FieldGroup>
                    <div className="auth-qr-placeholder"><ShieldCheck /><span>Vị trí mã QR xác thực</span></div>
                    <Field><FieldLabel htmlFor="auth-demo-code">Mã xác thực</FieldLabel><InputOTP id="auth-demo-code" inputMode="numeric" maxLength={6}><InputOTPGroup>{Array.from({length:6},(_,index)=><InputOTPSlot key={index} index={index} />)}</InputOTPGroup></InputOTP></Field>
                    <PreviewButton appearance="primary">Xác nhận</PreviewButton>
                </FieldGroup>}

            </AuthPanel>
        </AuthStage>
    </div>;
}
