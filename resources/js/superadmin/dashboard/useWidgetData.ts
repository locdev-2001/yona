import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchWidget } from './api';
import type { RangePreset } from './types';

export type WidgetState<T> =
    | { status: 'loading'; data: T | null }
    | { status: 'ready'; data: T }
    | { status: 'error'; data: T | null };

// Mỗi ô tự lấy số của mình; đổi khoảng ngày thì gọi lại và huỷ lần gọi cũ, bấm
// làm mới thì bỏ qua cache máy chủ. Đang tải lại vẫn giữ số cũ để ô không nháy.
export function useWidgetData<T>(endpoint: string, key: string, range: RangePreset, enabled = true) {
    const [state, setState] = useState<WidgetState<T>>({ status: 'loading', data: null });
    const [nonce, setNonce] = useState(0);
    const fresh = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        const controller = new AbortController();
        const bypassCache = fresh.current;
        fresh.current = false;
        setState(previous => ({ status: 'loading', data: previous.data }));

        fetchWidget<T>(endpoint, key, range, { signal: controller.signal, fresh: bypassCache })
            .then(response => setState({ status: 'ready', data: response.data }))
            .catch(() => {
                if (!controller.signal.aborted) setState(previous => ({ status: 'error', data: previous.data }));
            });

        return () => controller.abort();
    }, [endpoint, key, range, nonce, enabled]);

    const refresh = useCallback(() => {
        fresh.current = true;
        setNonce(value => value + 1);
    }, []);

    return { state, refresh };
}
