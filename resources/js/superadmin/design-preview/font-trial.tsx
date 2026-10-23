import { useEffect } from 'react';
import { PreviewButton } from './components';
import { usePreference } from './preferences';
import './font-trial.css';

const candidates = [
    { name: 'Manrope', note: 'Font đã duyệt: gọn, nét mở.', source: 'manrope' },
    { name: 'Be Vietnam Pro', note: 'Ưu tiên so sánh dấu tiếng Việt và nội dung dài.', source: 'bevietnampro' },
    { name: 'Plus Jakarta Sans', note: 'Tròn và có cá tính hơn cho tiêu đề, số liệu.', source: 'plusjakartasans' },
    { name: 'Inter', note: 'Font hiện tại để đối chiếu.', source: 'inter' },
] as const;

export function FontTrial() {
    const [font, setFont] = usePreference<string>('font-trial', 'Manrope', (candidate): candidate is string => candidates.some(font => font.name === candidate));
    useEffect(() => {
        const root = document.documentElement;
        root.dataset.fontTrial = '';
        root.style.setProperty('--font-trial-family', `"${font}", sans-serif`);
        return () => { delete root.dataset.fontTrial; root.style.removeProperty('--font-trial-family'); };
    }, [font]);
    return (
        <section className="font-trial" aria-label="So sánh font chữ cho component">
            <div className="font-trial-options" role="group" aria-label="Chọn font thử">
                {candidates.map(candidate => <PreviewButton key={candidate.name} appearance={font === candidate.name ? 'primary' : 'secondary'} aria-pressed={font === candidate.name} onClick={() => setFont(candidate.name)}>{candidate.name}</PreviewButton>)}
            </div>
            <p>{candidates.find(candidate => candidate.name === font)?.note} Manrope đã được chốt cho bộ component; các font khác để đối chiếu.</p>
            <p>Nguyễn Ánh · Quyền quản trị · Đăng ký mới · Tỉ lệ giữ chân · 0123456789 · 78,5% · 1.234.567 ₫</p>
            <p className="font-trial-source">Nguồn: <a href={`https://github.com/google/fonts/tree/main/ofl/${candidates.find(candidate => candidate.name === font)?.source}`} target="_blank" rel="noreferrer">Google Fonts</a></p>
        </section>
    );
}
