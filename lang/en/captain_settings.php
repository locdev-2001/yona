<?php

return [
    'TITLE' => 'Captain Settings',
    'DESCRIPTION' => 'Configure your AI models and features for Captain. Captain follows a credit based billing, you will be charged credits for every action Captain takes based on the model selected.',
    'LOADING' => 'Loading Captain configuration...',
    'LINK_TEXT' => 'Learn more about Captain Credits',
    'NOT_ENABLED' => 'Captain is not enabled for your account. Please upgrade your plan to access Captain features.',
    'MODEL_CONFIG' => [
        'TITLE' => 'Model Configuration',
        'DESCRIPTION' => 'Select AI models for different features.',
        'SELECT_MODEL' => 'Select model',
        'CREDITS_PER_MESSAGE' => '{credits} credit/message',
        'COMING_SOON' => 'Coming soon',
        'EDITOR' => [
            'TITLE' => 'Editor Features',
            'DESCRIPTION' => 'Powers smart compose, grammar corrections, tone adjustments, and content enhancement in your message editor.',
        ],
        'ASSISTANT' => [
            'TITLE' => 'Assistant',
            'DESCRIPTION' => 'Handles automated responses, conversation summaries, and intelligent reply suggestions for customer interactions.',
        ],
        'COPILOT' => [
            'TITLE' => 'Co-pilot',
            'DESCRIPTION' => 'Provides real-time contextual suggestions, knowledge base recommendations, and proactive insights during conversations.',
        ],
    ],
    'FEATURES' => [
        'TITLE' => 'Features',
        'DESCRIPTION' => 'Enable or disable AI-powered features.',
        'AUDIO_TRANSCRIPTION' => [
            'TITLE' => 'Audio Transcription',
            'DESCRIPTION' => 'Automatically convert voice messages and call recordings into searchable text transcripts.',
            'MODEL_TITLE' => 'Audio Transcription Model',
            'MODEL_DESCRIPTION' => 'Select the AI model to use for converting audio messages into text transcripts',
        ],
        'HELP_CENTER_SEARCH' => [
            'TITLE' => 'Help Center Search Indexing',
            'DESCRIPTION' => 'Use AI for context aware search inside your help center articles.',
        ],
        'LABEL_SUGGESTION' => [
            'TITLE' => 'Label Suggestion',
            'DESCRIPTION' => 'Automatically suggest relevant labels and tags for conversations based on content analysis and context.',
            'MODEL_TITLE' => 'Label Suggestion Model',
            'MODEL_DESCRIPTION' => 'Select the AI model to use for analyzing conversations and suggesting appropriate labels',
        ],
    ],
    'API' => [
        'SUCCESS' => 'Captain settings updated successfully.',
        'ERROR' => 'Failed to update Captain settings. Please try again.',
    ],
];
