import { Moon, MoveHorizontal, Sun } from '@admin/components/icons';
import { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PreviewButton } from './components';
import { CohortMatrix } from './cohort-matrix';
import { cohortDemoRows } from './cohort-demo';
import { themeStyle, type PreviewTheme } from './tokens';
import { WidgetCard } from './widget-card';
import './preview.css';
import './scrollbars.css';


function CohortDesignPreview() {
    const [theme, setTheme] = useState<PreviewTheme>('light');
    useLayoutEffect(() => {
        const root = document.documentElement;
        root.dataset.adminPreview = '';
        root.dataset.theme = theme;
        Object.entries(themeStyle(theme)).forEach(([property, value]) => root.style.setProperty(property, String(value)));
    }, [theme]);
    return (
        <div className="admin-preview" data-theme={theme}>
            <main className="cohort-design-page">
                <header className="cohort-design-intro">
                    <div>
                        <p>Đề xuất component · dùng token V1</p>
                        <h1>Ma trận giữ chân</h1>
                        <p>Số liệu minh hoạ · chờ duyệt trước khi áp dụng vào admin.</p>
                    </div>
                    <PreviewButton appearance="ghost" aria-label={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                        {theme === 'light' ? <Moon /> : <Sun />}
                    </PreviewButton>
                </header>
                <WidgetCard
                    title="Giữ chân theo tuần đăng ký"
                    description="Tỉ lệ tài khoản còn hoạt động qua từng tuần sau khi đăng ký."
                    seed="cohort-retention"
                    footer={<p className="cohort-design-note"><MoveHorizontal />Cuộn ngang để xem các tuần tiếp theo. Cột tuần đăng ký luôn được giữ lại.</p>}
                >
                    <CohortMatrix rows={cohortDemoRows} weeks={Array.from({ length: 8 }, (_, offset) => `Tuần ${offset}`)} label="Tỉ lệ giữ chân của từng nhóm tài khoản" />
                </WidgetCard>
                <p className="cohort-design-note">Thanh xanh biểu thị tỉ lệ giữ chân; dấu — là tuần chưa có số liệu.</p>
            </main>
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<CohortDesignPreview />);
