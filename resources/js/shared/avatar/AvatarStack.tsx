import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from './avatarSeed';

export interface AvatarStackPerson {
    user_id: number;
    name: string;
    avatar_url: string | null;
}

const MAX_FACES = 3;
const COUNT_CAP = 99;
// Tỉ lệ cạnh mỗi mặt so với khung: 3–4 ô xếp 2×2 chồng nhẹ, 2 ô xếp chéo to hơn.
const GRID_FACE_RATIO = 0.56;
const PAIR_FACE_RATIO = 0.64;

interface AvatarStackProps {
    people: AvatarStackPerson[];
    // Tổng số người; lớn hơn số mặt hiện thì ô cuối là con số này.
    total: number;
    size: number;
}

type Cell = { left: number; top: number } & ({ person: AvatarStackPerson } | { count: number });

function layoutCells(people: AvatarStackPerson[], total: number, size: number): { face: number; cells: Cell[] } {
    const faces = people.slice(0, MAX_FACES);
    const showCount = total > faces.length && faces.length === MAX_FACES;

    if (faces.length === 1) return { face: size, cells: [{ left: 0, top: 0, person: faces[0] }] };

    if (faces.length === 2 && !showCount) {
        const face = Math.round(size * PAIR_FACE_RATIO);
        const far = size - face;
        return { face, cells: [{ left: 0, top: 0, person: faces[0] }, { left: far, top: far, person: faces[1] }] };
    }

    const face = Math.round(size * GRID_FACE_RATIO);
    const far = size - face;
    const cells: Cell[] = [
        { left: 0, top: 0, person: faces[0] },
        { left: far, top: 0, person: faces[1] },
        showCount ? { left: 0, top: far, person: faces[2] } : { left: far / 2, top: far, person: faces[2] },
    ];
    if (showCount) cells.push({ left: far, top: far, count: total });

    return { face, cells };
}

// Avatar ghép kiểu nhóm chat: tối đa 3 mặt người + ô tổng số người, để nhìn qua là biết nhóm.
export default function AvatarStack({ people, total, size }: AvatarStackProps) {
    const { face, cells } = layoutCells(people, total, size);

    return (
        <span className="relative block" style={{ width: size, height: size }}>
            {cells.map((cell, index) => (
                <span
                    key={'person' in cell ? cell.person.user_id : 'count'}
                    className="absolute flex rounded-full ring-[1.5px] ring-n-solid-1"
                    style={{ left: cell.left, top: cell.top, width: face, height: face, zIndex: index }}
                >
                    {'person' in cell ? (
                        <Avatar
                            seed={avatarSeed('user', cell.person.user_id)}
                            src={cell.person.avatar_url ?? ''}
                            name={cell.person.name}
                            size={face}
                            roundedFull
                        />
                    ) : (
                        <span
                            className="flex items-center justify-center w-full h-full rounded-full bg-n-slate-3 text-n-slate-11 font-medium tabular-nums"
                            style={{ fontSize: Math.max(Math.round(face * 0.42), 8) }}
                        >
                            {cell.count > COUNT_CAP ? `${COUNT_CAP}+` : cell.count}
                        </span>
                    )}
                </span>
            ))}
        </span>
    );
}
