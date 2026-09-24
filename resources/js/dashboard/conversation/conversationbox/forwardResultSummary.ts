import type { ForwardResult } from '../forwardApi';

// Gom kết quả từng đích của một lượt chuyển tiếp thành một thông báo cho agent.

export interface ForwardResultSummary {
    kind: 'success' | 'partial' | 'failed';
    okCount: number;
    total: number;
    firstError: string | null;
    // Chỉ một đích và thành công → toast có nút mở hội thoại đó.
    singleTargetId: number | null;
}

export function summarizeForwardResults(results: ForwardResult[]): ForwardResultSummary {
    const total = results.length;
    const okCount = results.filter(result => result.ok).length;
    const firstError = results.find(result => !result.ok)?.error ?? null;
    const kind = total > 0 && okCount === total ? 'success' : okCount > 0 ? 'partial' : 'failed';

    return {
        kind,
        okCount,
        total,
        firstError,
        singleTargetId: kind === 'success' && total === 1 ? results[0].conversation_id : null,
    };
}
