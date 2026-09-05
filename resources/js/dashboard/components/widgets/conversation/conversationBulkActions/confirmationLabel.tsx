import { Fragment } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../../../i18n';

// Thay `<I18nT :plural>` + slot `#n` / `#agentName` của Chatwoot: lấy chuỗi thô
// (t không tham số = không nội suy), chọn nhánh số nhiều rồi bọc mỗi tham số
// bằng <strong> đúng như slot bản gốc.
export function confirmationLabel(key: string, count: number, values: Record<string, string> = {}): ReactNode {
    const template = t(key);
    const choices = template.split('|').map(choice => choice.trim());
    const chosen = choices.length < 2 ? template : (count === 1 ? choices[0] : choices[1]);

    const parts = chosen.split(/\{(\w+)\}/);

    return parts.map((part, index) => {
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;

        const value = part === 'n' ? String(count) : values[part];
        if (value === undefined) return <Fragment key={index}>{`{${part}}`}</Fragment>;

        return (
            <strong key={index} className="text-n-slate-12">
                {value}
            </strong>
        );
    });
}
