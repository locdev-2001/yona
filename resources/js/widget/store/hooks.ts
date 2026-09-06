import { useSyncExternalStore } from 'react';

import { widgetStore } from './widgetStore';
import type { WidgetState } from './widgetStore';

// Đọc store trong component — thay mapGetters của Vuex.
export function useWidgetState<T>(selector: (state: WidgetState) => T): T {
    return useSyncExternalStore(
        widgetStore.subscribe,
        () => selector(widgetStore.getState()),
        () => selector(widgetStore.getState()),
    );
}
