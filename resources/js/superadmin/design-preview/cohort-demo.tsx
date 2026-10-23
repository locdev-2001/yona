import { CohortMatrix, type CohortMatrixRow } from './cohort-matrix';
const samples = [
    { week: '31/08', members: 48, retention: [100, 78, 64, 57, 49, 43, 38, 35] },
    { week: '07/09', members: 62, retention: [100, 81, 68, 59, 52, 47, 42] },
    { week: '14/09', members: 55, retention: [100, 76, 63, 54, 48, 44] },
    { week: '21/09', members: 73, retention: [100, 84, 72, 65, 58] },
    { week: '28/09', members: 68, retention: [100, 79, 66, 60] },
    { week: '05/10', members: 81, retention: [100, 86, 74] },
    { week: '12/10', members: 76, retention: [100, 83] },
    { week: '19/10', members: 92, retention: [100] },
];
export const cohortDemoRows: CohortMatrixRow[] = samples.map(sample => ({
    id: sample.week,
    week: sample.week,
    members: `${sample.members} tài khoản`,
    retention: sample.retention.map((percent, offset) => ({
        percent,
        label: `${percent}%`,
        description: `Nhóm đăng ký ${sample.week}, tuần ${offset}: ${percent}% còn hoạt động`,
    })),
}));

export function CohortDemo() {
    return <><p className="catalogue-hint">Mẫu đề xuất · số liệu minh hoạ · cuộn ngang để xem các tuần tiếp theo.</p><CohortMatrix rows={cohortDemoRows} weeks={Array.from({length: 8}, (_, offset) => `Tuần ${offset}`)} label="Ma trận giữ chân theo tuần đăng ký" /></>;
}
