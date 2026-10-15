import { t } from '../../i18n';

// Mẫu persona bấm một lần là điền sẵn. Khoá cố định trong code, chữ ở lang/*/ai_agents.php.
export const PERSONA_PRESET_KEYS = ['FRIENDLY', 'PROFESSIONAL', 'YOUTHFUL'] as const;
export const CUSTOM_PERSONA = 'CUSTOM';

export type PersonaPresetKey = (typeof PERSONA_PRESET_KEYS)[number];
export type PersonaChoice = PersonaPresetKey | typeof CUSTOM_PERSONA;

export const personaPresetLabel = (choice: PersonaChoice): string => t(`AI_AGENTS.PRESETS.${choice}.LABEL`);

export const personaPresetText = (key: PersonaPresetKey): string => t(`AI_AGENTS.PRESETS.${key}.TEXT`);

// Persona đang khớp nguyên văn mẫu nào thì mẫu đó sáng; đã sửa hay tự viết là "Tự viết".
export function matchPersonaPreset(persona: string): PersonaChoice {
    const trimmed = persona.trim();

    return PERSONA_PRESET_KEYS.find(key => personaPresetText(key) === trimmed) ?? CUSTOM_PERSONA;
}
