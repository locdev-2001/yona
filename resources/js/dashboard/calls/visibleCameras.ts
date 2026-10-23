import { useRef } from 'react';
import type { CallParticipantView } from './types';

const CAMERA_BUDGET = { grid: 8, screenThumbnails: 4 } as const;
const SPEAKER_HOLD_MS = 10_000;

export function useVisibleCameras(participants: CallParticipantView[], hasScreen: boolean): Set<string> {
    const recentSpeakers = useRef(new Map<string, number>());
    const now = performance.now();
    const identities = new Set(participants.map((participant) => participant.identity));
    for (const identity of recentSpeakers.current.keys()) if (!identities.has(identity)) recentSpeakers.current.delete(identity);
    participants.forEach((participant) => {
        if (participant.isSpeaking) recentSpeakers.current.set(participant.identity, now);
    });
    const score = (participant: CallParticipantView) =>
        participant.isLocal ? 3 : now - (recentSpeakers.current.get(participant.identity) ?? -Infinity) < SPEAKER_HOLD_MS ? 2 : 1;
    return new Set(
        participants
            .filter((participant) => participant.camOn)
            .sort((first, second) => score(second) - score(first))
            .slice(0, hasScreen ? CAMERA_BUDGET.screenThumbnails : CAMERA_BUDGET.grid)
            .map((participant) => participant.identity),
    );
}
