import { describe, expect, it } from 'vitest';

import {
    emptyMacro,
    formatMacro,
    generateMacroPayload,
    getFileName,
    getMacroDropdownValues,
    MACRO_ACTION_TYPES,
    resolveActionName,
    resolveMacroActions,
    showMacroActionInput,
} from './macroHelper';
import type { MacroOptionSets } from './types';

// Port từ helper/specs/macrosHelper.spec.js + composables/spec/useMacros.spec.js
const files = [
    { blob_id: 'blob-1', filename: 'hello.png' },
    { blob_id: 'blob-2', filename: 'invoice.pdf' },
];

const optionSets: MacroOptionSets = {
    agents: [{ id: 1, name: 'Maya Chen' }],
    teams: [{ id: 5, name: 'Sales' }],
    labels: [
        { id: 'billing', name: 'billing' },
        { id: 'spam', name: 'spam' },
    ],
};

describe('emptyMacro', () => {
    it('returns the default macro', () => {
        expect(emptyMacro).toEqual({
            name: '',
            actions: [{ action_name: 'assign_team', action_params: [] }],
            visibility: 'global',
        });
    });
});

describe('resolveActionName', () => {
    it('resolves the label from the action key', () => {
        expect(resolveActionName(MACRO_ACTION_TYPES[0].key)).toEqual(MACRO_ACTION_TYPES[0].label);
        expect(resolveActionName(MACRO_ACTION_TYPES[1].key)).toEqual(MACRO_ACTION_TYPES[1].label);
        expect(resolveActionName(MACRO_ACTION_TYPES[1].key)).not.toEqual(MACRO_ACTION_TYPES[0].label);
        expect(resolveActionName('change_priority')).toEqual('CHANGE_PRIORITY');
    });

    it('falls back to the upper cased key for actions the builder does not offer', () => {
        expect(resolveActionName('change_status')).toEqual('CHANGE_STATUS');
    });
});

describe('getFileName', () => {
    it('returns the matching file name', () => {
        expect(getFileName(files[0].blob_id, 'send_attachment', files)).toEqual(files[0].filename);
        expect(getFileName(files[1].blob_id, 'send_attachment', files)).toEqual(files[1].filename);
        expect(getFileName(files[0].blob_id, 'wrong_action', files)).toEqual('');
        expect(getFileName(null, 'send_attachment', files)).toEqual('');
        expect(getFileName(files[0].blob_id, 'send_attachment', [])).toEqual('');
    });
});

describe('getMacroDropdownValues', () => {
    it('puts a None option before the teams', () => {
        expect(getMacroDropdownValues('assign_team', optionSets)).toEqual([
            { id: 'nil', name: 'None' },
            { id: 5, name: 'Sales' },
        ]);
    });

    it('offers Self for assign_agent', () => {
        expect(getMacroDropdownValues('assign_agent', optionSets)).toEqual([
            { id: 'nil', name: 'None' },
            { id: 'self', name: 'Self' },
            { id: 1, name: 'Maya Chen' },
        ]);
    });

    it('returns labels for both label actions', () => {
        expect(getMacroDropdownValues('add_label', optionSets)).toEqual(optionSets.labels);
        expect(getMacroDropdownValues('remove_label', optionSets)).toEqual(optionSets.labels);
    });

    it('translates the priority values', () => {
        expect(getMacroDropdownValues('change_priority', optionSets)).toEqual([
            { id: 'nil', name: 'None' },
            { id: 'low', name: 'Low' },
            { id: 'medium', name: 'Medium' },
            { id: 'high', name: 'High' },
            { id: 'urgent', name: 'Urgent' },
        ]);
    });

    it('returns nothing for actions without parameters', () => {
        expect(getMacroDropdownValues('mute_conversation', optionSets)).toEqual([]);
    });
});

describe('showMacroActionInput', () => {
    it('hides the inline input for send_message and for actions without parameters', () => {
        expect(showMacroActionInput('send_message')).toBe(false);
        expect(showMacroActionInput('mute_conversation')).toBe(false);
        expect(showMacroActionInput('assign_team')).toBe(true);
        expect(showMacroActionInput('add_label')).toBe(true);
    });
});

describe('resolveMacroActions', () => {
    it('maps stored ids back to the option names shown in the builder', () => {
        const macro = {
            actions: [
                { action_name: 'add_label', action_params: ['billing', 'spam'] },
                { action_name: 'assign_team', action_params: [5] },
                { action_name: 'resolve_conversation', action_params: [] },
                { action_name: 'send_message', action_params: ['Hello there'] },
            ],
        };

        expect(resolveMacroActions(macro, optionSets)).toEqual([
            { actionName: 'ADD_LABEL', actionValue: 'billing, spam' },
            { actionName: 'ASSIGN_TEAM', actionValue: 'Sales' },
            { actionName: 'RESOLVE_CONVERSATION', actionValue: '' },
            { actionName: 'SEND_MESSAGE', actionValue: 'Hello there' },
        ]);
    });

    it('reads the file name for attachments', () => {
        const macro = { actions: [{ action_name: 'send_attachment', action_params: ['blob-2'] }], files };

        expect(resolveMacroActions(macro, optionSets)).toEqual([
            { actionName: 'SEND_ATTACHMENT', actionValue: 'invoice.pdf' },
        ]);
    });
});

describe('formatMacro', () => {
    it('turns saved ids into dropdown options and leaves plain params alone', () => {
        const formatted = formatMacro(
            {
                actions: [
                    { action_name: 'add_label', action_params: ['spam'] },
                    { action_name: 'send_message', action_params: ['Hi'] },
                    { action_name: 'mute_conversation', action_params: [] },
                ],
            },
            optionSets,
        );

        expect(formatted.actions).toEqual([
            { action_name: 'add_label', action_params: [{ id: 'spam', name: 'spam' }] },
            { action_name: 'send_message', action_params: ['Hi'] },
            { action_name: 'mute_conversation', action_params: [] },
        ]);
    });
});

describe('generateMacroPayload', () => {
    it('flattens dropdown options back to ids', () => {
        const payload = generateMacroPayload({
            name: 'Close it',
            visibility: 'global',
            actions: [
                { action_name: 'add_label', action_params: [{ id: 'spam', name: 'spam' }] },
                { action_name: 'assign_team', action_params: [{ id: 5, name: 'Sales' }] },
                { action_name: 'send_message', action_params: 'Hello' },
                { action_name: 'mute_conversation', action_params: [] },
            ],
        });

        expect(payload).toEqual({
            name: 'Close it',
            visibility: 'global',
            actions: [
                { action_name: 'add_label', action_params: ['spam'] },
                { action_name: 'assign_team', action_params: [5] },
                { action_name: 'send_message', action_params: ['Hello'] },
                { action_name: 'mute_conversation', action_params: [] },
            ],
        });
    });
});
