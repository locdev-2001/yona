import { usePage } from '@inertiajs/react';
import type { SharedPageProps } from '../../types';

// Máy chủ cuộc gọi đã cấu hình chưa: chưa thì mọi nút gọi đều ẩn.
export const useCallsEnabled = (): boolean => Boolean(usePage<SharedPageProps>().props.globalConfig?.callsEnabled);
