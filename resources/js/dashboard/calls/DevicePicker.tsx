import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { t } from '../../i18n';
import type { CallDevice, CallDeviceKind } from './types';
import { useAlert } from 'dashboard/composables/useAlert';

// Bảng chọn micro / camera mở lên trên nút mũi tên (hàng nút nằm ở đáy màn phòng).
export default function DevicePicker({
    kind,
    listDevices,
    onSelect,
    children,
}: {
    kind: CallDeviceKind;
    listDevices: (kind: CallDeviceKind) => Promise<CallDevice[]>;
    onSelect: (kind: CallDeviceKind, deviceId: string) => void | Promise<void>;
    children: (toggle: () => void) => ReactNode;
}) {
    const [devices, setDevices] = useState<CallDevice[] | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (devices === null) return undefined;
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setDevices(null);
        };
        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [devices]);

    const toggle = () => {
        if (devices !== null) {
            setDevices(null);
            return;
        }
        listDevices(kind)
            .then(setDevices)
            .catch(() => setDevices([]));
    };

    return (
        <div ref={rootRef} className="relative flex">
            {children(toggle)}
            {devices !== null ? (
                <DropdownMenu
                    menuItems={
                        devices.length > 0
                            ? devices.map((device, index) => ({
                                  // Trình duyệt chưa cấp quyền thì không trả tên thiết bị: đánh số thay vì hiện mã.
                                  label:
                                      device.label ||
                                      t(
                                          kind === 'audioinput'
                                              ? 'CALLS.ROOM.MICROPHONE_N'
                                              : kind === 'videoinput'
                                                ? 'CALLS.ROOM.CAMERA_N'
                                                : 'CALLS.QUALITY.DEVICE_N',
                                          { n: index + 1 },
                                      ),
                                  value: device.id,
                                  action: 'select',
                                  isSelected: device.isActive,
                              }))
                            : [{ label: t('CALLS.ROOM.NO_DEVICES'), value: '', action: 'none', disabled: true }]
                    }
                    className="bottom-full mb-2 start-0 w-64"
                    onAction={(item) => {
                        if (item.action === 'select')
                            Promise.resolve(onSelect(kind, String(item.value))).catch(() => useAlert(t('CALLS.ROOM.DEVICE_BLOCKED')));
                        setDevices(null);
                    }}
                />
            ) : null}
        </div>
    );
}
