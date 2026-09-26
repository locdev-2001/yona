import { useState } from 'react';

import { useMessageHost } from '../host';
import type { StructuredMessage, SubmittedValue } from '../model';

/**
 * Câu trả lời của khách cho một tin: đã ghi trên server (`submitted_values`) hoặc
 * vừa bấm (hiện ngay, hoàn tác nếu gửi lỗi). Một nguồn cho chip, nút, form.
 */
export function useSubmission(message: StructuredMessage) {
    const host = useMessageHost();
    const stored = message.content_attributes?.submitted_values;
    const saved = Array.isArray(stored) ? (stored as SubmittedValue[]) : null;
    const [pending, setPending] = useState<SubmittedValue[] | null>(null);
    const [failed, setFailed] = useState(false);

    const values = saved ?? pending;

    const submit = async (next: SubmittedValue[]) => {
        if (values || !host.interactive) return;

        setFailed(false);
        setPending(next);

        try {
            await host.submit(message, next);
        } catch {
            setPending(null);
            setFailed(true);
        }
    };

    return { values, answered: values !== null, saved: saved !== null, failed, submit, interactive: host.interactive };
}
