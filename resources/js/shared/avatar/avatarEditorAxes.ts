import { traits as readTraits } from 'blobatar';

import type { AvatarTraits } from './avatarSeed';

// Đặc tả các trục chỉnh được của avatar hình khối — nguồn duy nhất cho AvatarEditor. Khoá và
// mốc phải khớp đúng bản blobatar đang cài (đổi bản chính là đổi hình): vị trí trong [0, 1)
// thư viện đọc thay cho giá trị băm từ tên.

export type ShapeName = 'round' | 'organic' | 'boxy' | 'capsule' | 'nub' | 'cloud' | 'droplet' | 'hexagon' | 'sun' | 'triangle';
export type ToneName = 'pastel' | 'pale' | 'mid' | 'deep' | 'bright' | 'ink';
export type AxisGroup = 'shape' | 'body' | 'eyes' | 'color' | 'decoration';

export interface AvatarChoice<TName extends string> {
    name: TName;
    // Vị trí ghim để chắc chắn ra lựa chọn này.
    at: number;
    // Mốc trên (không gồm) của khoảng giá trị băm rơi vào lựa chọn này.
    until: number;
}

export const AVATAR_SHAPES: readonly AvatarChoice<ShapeName>[] = [
    { name: 'round', at: 0.11, until: 0.22 },
    { name: 'organic', at: 0.35, until: 0.48 },
    { name: 'boxy', at: 0.54, until: 0.6 },
    { name: 'capsule', at: 0.65, until: 0.7 },
    { name: 'nub', at: 0.745, until: 0.79 },
    { name: 'cloud', at: 0.825, until: 0.86 },
    { name: 'droplet', at: 0.888, until: 0.915 },
    { name: 'hexagon', at: 0.933, until: 0.95 },
    { name: 'sun', at: 0.965, until: 0.98 },
    { name: 'triangle', at: 0.99, until: 1 },
];

export const AVATAR_TONES: readonly AvatarChoice<ToneName>[] = [
    { name: 'pastel', at: 0.1, until: 0.2 },
    { name: 'pale', at: 0.28, until: 0.38 },
    { name: 'mid', at: 0.49, until: 0.6 },
    { name: 'deep', at: 0.71, until: 0.82 },
    { name: 'bright', at: 0.865, until: 0.93 },
    { name: 'ink', at: 0.965, until: 1 },
];

export interface AvatarSliderAxis {
    key: string;
    group: Exclude<AxisGroup, 'shape'>;
    // Chỉ có tác dụng với các dáng này (thiếu = mọi dáng).
    when?: readonly ShapeName[];
    // Trục đếm (số cánh, số múi…): thanh trượt theo nấc.
    bands?: number;
}

export const AVATAR_GROUPS: readonly AxisGroup[] = ['shape', 'body', 'eyes', 'color', 'decoration'];

export const AVATAR_SLIDER_AXES: readonly AvatarSliderAxis[] = [
    { key: 'body.r', group: 'body' },
    { key: 'body.ratio', group: 'body' },
    { key: 'body.n', group: 'body' },
    { key: 'body.rot', group: 'body', when: ['boxy', 'triangle', 'hexagon'] },
    { key: 'capsule.squat', group: 'body', when: ['capsule'] },
    { key: 'poly.round', group: 'body', when: ['triangle', 'hexagon'] },
    { key: 'eye.rx', group: 'eyes' },
    { key: 'eye.ratio', group: 'eyes' },
    { key: 'eye.n', group: 'eyes' },
    { key: 'eye.gap', group: 'eyes' },
    { key: 'eye.lean', group: 'eyes' },
    { key: 'gaze.x', group: 'eyes' },
    { key: 'gaze.y', group: 'eyes' },
    { key: 'hue', group: 'color' },
    { key: 'sun.n', group: 'decoration', when: ['sun'], bands: 4 },
    { key: 'sun.dist', group: 'decoration', when: ['sun'] },
    { key: 'sun.r', group: 'decoration', when: ['sun'] },
    { key: 'sun.rot', group: 'decoration', when: ['sun'] },
    { key: 'cloud.n', group: 'decoration', when: ['cloud'], bands: 3 },
    { key: 'nub.n', group: 'decoration', when: ['nub'], bands: 2 },
    { key: 'nub.a0', group: 'decoration', when: ['nub'] },
    { key: 'nub.r0', group: 'decoration', when: ['nub'] },
    { key: 'droplet.tip', group: 'decoration', when: ['droplet'] },
];

// Khoá i18n của một trục: `eye.gap` → `EYE_GAP`.
export function axisLabelKey(key: string): string {
    return key.replace('.', '_').toUpperCase();
}

// Vị trí thư viện tự suy từ seed khi trục chưa ghim (cùng chuẩn hoá như lúc dựng hình).
export function hashedPosition(seed: string, key: string): number {
    return readTraits(seed, true)(key);
}

function choiceAt<TName extends string>(choices: readonly AvatarChoice<TName>[], position: number): TName {
    return (choices.find(choice => position < choice.until) ?? choices[choices.length - 1]).name;
}

function pinnedChoices<TName extends string>(choices: readonly AvatarChoice<TName>[], pinned: AvatarTraits[string] | undefined): TName[] {
    const positions = pinned === undefined ? [] : Array.isArray(pinned) ? pinned : [pinned];

    return choices.filter(choice => positions.includes(choice.at)).map(choice => choice.name);
}

// Dáng có thể ra: dáng đã ghim, chưa ghim thì dáng seed tự rơi vào.
export function possibleShapes(seed: string, traits: AvatarTraits | null): ShapeName[] {
    const pinned = pinnedChoices(AVATAR_SHAPES, traits?.shape);

    return pinned.length > 0 ? pinned : [choiceAt(AVATAR_SHAPES, hashedPosition(seed, 'shape'))];
}

export function selectedChoices<TName extends string>(choices: readonly AvatarChoice<TName>[], traits: AvatarTraits | null, key: string): TName[] {
    return pinnedChoices(choices, traits?.[key]);
}

// Bật/tắt một lựa chọn trong danh sách đã ghim; rỗng = bỏ ghim, một = số, nhiều = mảng.
export function toggleChoice<TName extends string>(
    choices: readonly AvatarChoice<TName>[],
    selected: TName[],
    name: TName,
): number | number[] | undefined {
    const next = selected.includes(name) ? selected.filter(item => item !== name) : [...selected, name];
    const positions = choices.filter(choice => next.includes(choice.name)).map(choice => choice.at);

    if (positions.length === 0) return undefined;

    return positions.length === 1 ? positions[0] : positions;
}

export function isAxisActive(axis: AvatarSliderAxis, shapes: ShapeName[]): boolean {
    return !axis.when || shapes.some(shape => axis.when?.includes(shape));
}

export function bandIndex(position: number, bands: number): number {
    return Math.min(bands - 1, Math.max(0, Math.floor(position * bands)));
}

export function bandPosition(index: number, bands: number): number {
    return Math.round(((index + 0.5) / bands) * 1000) / 1000;
}

// Tên ngẫu nhiên cho nút đảo tên và hàng "tên khác, cùng cấu hình".
export function randomAvatarName(): string {
    return Math.random().toString(36).slice(2, 9);
}
