import Avatar from 'dashboard/components-next/avatar/Avatar';
import BaseCell from 'dashboard/components/table/BaseCell';
import type { AvailabilityStatus } from '../../../types';

// Port từ reports/components/overview/AgentCell.vue
export interface AgentTableRow {
    agent: string;
    // Định danh bền (avatarSeed) cho avatar hình khối khi nhân viên chưa có ảnh.
    avatarSeed?: string;
    email?: string;
    thumbnail?: string;
    open: number;
    unattended: number;
    status?: AvailabilityStatus;
}

export default function AgentCell({ row }: { row: AgentTableRow }) {
    return (
        <BaseCell>
            <div className="items-center flex text-left">
                <Avatar
                    seed={row.avatarSeed}
                    src={row.thumbnail}
                    name={row.agent}
                    status={row.status ?? null}
                    size={32}
                    hideOfflineStatus
                    roundedFull
                />
                <div className="items-start flex flex-col min-w-0 my-0 mx-2">
                    <h6 className="overflow-hidden text-sm m-0 leading-[1.2] text-n-slate-12 whitespace-nowrap text-ellipsis">
                        {row.agent}
                    </h6>
                    <span className="text-xs text-n-slate-11">{row.email}</span>
                </div>
            </div>
        </BaseCell>
    );
}
