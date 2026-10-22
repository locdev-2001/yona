export const CALL_QUALITY = {
    screen: { width: 1920, height: 1080, frameRate: 60, maxBitrate: 10_000_000 },
    camera: { width: 1280, height: 720, frameRate: 30, maxBitrate: 2_000_000 },
} as const;

export function screenBelowRequirement(stream: { width: number | null; height: number | null; fps: number | null }): boolean {
    const requirement = CALL_QUALITY.screen;
    return (
        (stream.width !== null && stream.width < requirement.width) ||
        (stream.height !== null && stream.height < requirement.height) ||
        (stream.fps !== null && Math.round(stream.fps) < requirement.frameRate)
    );
}

export const screenRequirementLabel = () => ({
    resolution: `${CALL_QUALITY.screen.width}×${CALL_QUALITY.screen.height}`,
    fps: CALL_QUALITY.screen.frameRate,
});
