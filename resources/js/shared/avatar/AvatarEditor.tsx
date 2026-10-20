import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import { t } from '../../i18n';
import AvatarAxisSlider from './AvatarAxisSlider';
import {
    AVATAR_GROUPS,
    AVATAR_SHAPES,
    AVATAR_SLIDER_AXES,
    AVATAR_TONES,
    axisLabelKey,
    hashedPosition,
    isAxisActive,
    possibleShapes,
    randomAvatarName,
    selectedChoices,
    toggleChoice,
} from './avatarEditorAxes';
import type { AvatarChoice, AxisGroup } from './avatarEditorAxes';
import { avatarSeed } from './avatarSeed';
import type { AvatarSubject, AvatarTraits } from './avatarSeed';

const PREVIEW_SIZE_PX = 112;
const CHIP_AVATAR_SIZE_PX = 32;
const OTHER_NAME_COUNT = 6;
const OTHER_NAME_SIZE_PX = 28;
const NAME_MAX_LENGTH = 32;

export interface GeneratedAvatarValue {
    // Tên dựng hình (seed); cùng tên + cùng trục ghim luôn ra cùng một hình.
    name: string;
    traits: AvatarTraits | null;
}

interface AvatarEditorProps {
    // Loại chủ thể: phải trùng với chỗ hiển thị avatar sau khi lưu.
    subject: AvatarSubject;
    value: GeneratedAvatarValue;
    onChange: (value: GeneratedAvatarValue) => void;
}

const CHIP_CLASS = 'flex flex-col items-center gap-1 p-1.5 rounded-xl text-[0.6875rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-n-brand';
const CHIP_SELECTED_CLASS = 'bg-n-alpha-2 text-n-slate-12 ring-1 ring-n-brand';
const CHIP_IDLE_CLASS = 'text-n-slate-11 hover:bg-n-alpha-1';

function randomNames(): string[] {
    return Array.from({ length: OTHER_NAME_COUNT }, randomAvatarName);
}

/**
 * Trình chỉnh avatar hình khối dùng chung: đặt tên, ghim từng trục (dáng, thân, mắt, màu,
 * trang trí), trục không ghim vẫn theo tên. Không biết chủ thể là nhóm hay người — nơi gọi
 * tự lưu `{ name, traits }`.
 */
export default function AvatarEditor({ subject, value, onChange }: AvatarEditorProps) {
    const [otherNames, setOtherNames] = useState(randomNames);
    const seed = avatarSeed(subject, value.name) ?? value.name;
    const traits = value.traits;
    const pinnedCount = Object.keys(traits ?? {}).length;
    const shapes = useMemo(() => possibleShapes(seed, traits), [seed, traits]);

    const setTraits = (next: AvatarTraits) => onChange({ name: value.name, traits: Object.keys(next).length > 0 ? next : null });
    const setPin = (key: string, position: number | number[] | undefined) => {
        const next = { ...(traits ?? {}) };
        if (position === undefined) delete next[key];
        else next[key] = position;
        setTraits(next);
    };
    const positionOf = (key: string): number => {
        const pinned = traits?.[key];
        return typeof pinned === 'number' ? pinned : hashedPosition(seed, key);
    };

    const choiceChips = <TName extends string>(key: string, choices: readonly AvatarChoice<TName>[], labelPrefix: string): ReactNode => {
        const selected = selectedChoices(choices, traits, key);
        const chip = (label: string, isSelected: boolean, preview: AvatarTraits | null, onClick: () => void, chipKey: string) => (
            <button
                key={chipKey}
                type="button"
                aria-pressed={isSelected}
                className={`${CHIP_CLASS} ${isSelected ? CHIP_SELECTED_CLASS : CHIP_IDLE_CLASS}`}
                onClick={onClick}
            >
                <Avatar seed={seed} traits={preview} name="" size={CHIP_AVATAR_SIZE_PX} roundedFull />
                <span className="truncate max-w-full">{label}</span>
            </button>
        );

        return (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                {chip(t('AVATAR_EDITOR.AUTO'), selected.length === 0, traits, () => setPin(key, undefined), 'auto')}
                {choices.map(choice =>
                    chip(
                        t(`${labelPrefix}.${choice.name.toUpperCase()}`),
                        selected.includes(choice.name),
                        { ...(traits ?? {}), [key]: choice.at },
                        () => setPin(key, toggleChoice(choices, selected, choice.name)),
                        choice.name,
                    ),
                )}
            </div>
        );
    };

    const groupBody = (group: AxisGroup): ReactNode => {
        if (group === 'shape') return choiceChips('shape', AVATAR_SHAPES, 'AVATAR_EDITOR.SHAPES');

        const axes = AVATAR_SLIDER_AXES.filter(axis => axis.group === group);
        const active = axes.filter(axis => isAxisActive(axis, shapes));
        const inactive = axes.filter(axis => !isAxisActive(axis, shapes));

        return (
            <div className="flex flex-col gap-3">
                {group === 'color' ? choiceChips('tone', AVATAR_TONES, 'AVATAR_EDITOR.TONES') : null}
                {active.map(axis => (
                    <AvatarAxisSlider
                        key={axis.key}
                        label={t(`AVATAR_EDITOR.AXES.${axisLabelKey(axis.key)}`)}
                        value={positionOf(axis.key)}
                        pinned={typeof traits?.[axis.key] === 'number'}
                        bands={axis.bands}
                        onChange={position => setPin(axis.key, position)}
                        onTogglePin={() => setPin(axis.key, traits?.[axis.key] === undefined ? positionOf(axis.key) : undefined)}
                    />
                ))}
                {inactive.length > 0 ? (
                    <p className="m-0 text-xs text-n-slate-10">
                        {t('AVATAR_EDITOR.ONLY_FOR', {
                            labels: inactive.map(axis => t(`AVATAR_EDITOR.AXES.${axisLabelKey(axis.key)}`)).join(', '),
                            shapes: [...new Set(inactive.flatMap(axis => axis.when ?? []))]
                                .map(shape => t(`AVATAR_EDITOR.SHAPES.${shape.toUpperCase()}`))
                                .join(', '),
                        })}
                    </p>
                ) : null}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-5 w-full">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar seed={seed} traits={traits} name={value.name} size={PREVIEW_SIZE_PX} animated roundedFull className="shrink-0" />
                <div className="flex flex-col gap-3 w-full min-w-0">
                    <div className="flex items-end gap-2">
                        <Input
                            label={t('AVATAR_EDITOR.NAME')}
                            value={value.name}
                            maxLength={NAME_MAX_LENGTH}
                            className="flex-1 min-w-0"
                            onChange={event => onChange({ name: event.target.value, traits })}
                        />
                        <Button
                            type="button"
                            faded
                            slate
                            icon="i-lucide-shuffle"
                            aria-label={t('AVATAR_EDITOR.SHUFFLE')}
                            title={t('AVATAR_EDITOR.SHUFFLE')}
                            onClick={() => {
                                onChange({ name: randomAvatarName(), traits });
                                setOtherNames(randomNames());
                            }}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-n-slate-11">{t('AVATAR_EDITOR.OTHER_NAMES')}</span>
                        <div className="flex flex-wrap gap-1.5">
                            {otherNames.map(name => (
                                <button
                                    key={name}
                                    type="button"
                                    aria-label={t('AVATAR_EDITOR.USE_NAME', { name })}
                                    title={name}
                                    className="flex rounded-full outline-none hover:ring-2 hover:ring-n-weak focus-visible:ring-2 focus-visible:ring-n-brand"
                                    onClick={() => onChange({ name, traits })}
                                >
                                    <Avatar seed={avatarSeed(subject, name)} traits={traits} name="" size={OTHER_NAME_SIZE_PX} roundedFull />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-n-slate-11">
                <span>{pinnedCount > 0 ? t('AVATAR_EDITOR.PINNED_COUNT', { count: pinnedCount }) : t('AVATAR_EDITOR.PINNED_NONE')}</span>
                <Button type="button" link slate xs label={t('AVATAR_EDITOR.UNPIN_ALL')} disabled={pinnedCount === 0} onClick={() => setTraits({})} />
            </div>

            {AVATAR_GROUPS.map(group => (
                <section key={group} className="flex flex-col gap-2.5" aria-labelledby={`avatar-editor-${group}`}>
                    <h4 id={`avatar-editor-${group}`} className="m-0 pb-1.5 text-xs font-medium text-n-slate-12 border-b border-n-weak">
                        {t(`AVATAR_EDITOR.GROUPS.${group.toUpperCase()}`)}
                    </h4>
                    {groupBody(group)}
                </section>
            ))}
        </div>
    );
}
