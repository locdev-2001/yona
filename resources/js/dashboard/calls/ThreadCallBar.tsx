import { useIsPhoneScreen } from 'dashboard/composables/useViewportWidth';
import CallBar from './CallBar';
import { useCallSession } from './callSession';

// Điện thoại đang mở hội thoại: thanh cuộc gọi nằm trong luồng ngay trên ô nhập, danh sách tin co lại
// thay vì bị thanh đẩy xuống dưới ô nhập.
export default function ThreadCallBar() {
    const call = useCallSession();
    const isPhone = useIsPhoneScreen();

    return call.room && !call.stageOpen && isPhone ? <CallBar room={call.room} local={call.local} actions={call.actions} /> : null;
}
