<?php

namespace App\Support;

// Port từ gem Haikunator (usmanbashir/haikunator) — Chatwoot dùng
// Haikunator.haikunate(1000) đặt tên fallback cho contact vô danh
// (kiểu "misty-lake-421"), giữ nguyên danh sách từ của gem.
class Haikunator
{
    private const ADJECTIVES = [
        'aged', 'ancient', 'autumn', 'billowing', 'bitter', 'black', 'blue', 'bold',
        'broad', 'broken', 'calm', 'cold', 'cool', 'crimson', 'curly', 'damp',
        'dark', 'dawn', 'delicate', 'divine', 'dry', 'empty', 'falling', 'fancy',
        'flat', 'floral', 'fragrant', 'frosty', 'gentle', 'green', 'hidden', 'holy',
        'icy', 'jolly', 'late', 'lingering', 'little', 'lively', 'long', 'lucky',
        'misty', 'morning', 'muddy', 'mute', 'nameless', 'noisy', 'odd', 'old',
        'orange', 'patient', 'plain', 'polished', 'proud', 'purple', 'quiet', 'rapid',
        'raspy', 'red', 'restless', 'rough', 'round', 'royal', 'shiny', 'shrill',
        'shy', 'silent', 'small', 'snowy', 'soft', 'solitary', 'sparkling', 'spring',
        'square', 'steep', 'still', 'summer', 'super', 'sweet', 'throbbing', 'tight',
        'tiny', 'twilight', 'wandering', 'weathered', 'white', 'wild', 'winter', 'wispy',
        'withered', 'yellow', 'young',
    ];

    private const NOUNS = [
        'art', 'band', 'bar', 'base', 'bird', 'block', 'boat', 'bonus',
        'bread', 'breeze', 'brook', 'bush', 'butterfly', 'cake', 'cell', 'cherry',
        'cloud', 'credit', 'darkness', 'dawn', 'dew', 'disk', 'dream', 'dust',
        'feather', 'field', 'fire', 'firefly', 'flower', 'fog', 'forest', 'frog',
        'frost', 'glade', 'glitter', 'grass', 'hall', 'hat', 'haze', 'heart',
        'hill', 'king', 'lab', 'lake', 'leaf', 'limit', 'math', 'meadow',
        'mode', 'moon', 'morning', 'mountain', 'mouse', 'mud', 'night', 'paper',
        'pine', 'poetry', 'pond', 'queen', 'rain', 'recipe', 'resonance', 'rice',
        'river', 'salad', 'scene', 'sea', 'shadow', 'shape', 'silence', 'sky',
        'smoke', 'snow', 'snowflake', 'sound', 'star', 'sun', 'sunset', 'surf',
        'term', 'thunder', 'tooth', 'tree', 'truth', 'union', 'unit', 'violet',
        'voice', 'water', 'waterfall', 'wave', 'wildflower', 'wind', 'wood',
    ];

    public static function haikunate(int $tokenRange = 9999): string
    {
        return sprintf(
            '%s-%s-%d',
            self::ADJECTIVES[array_rand(self::ADJECTIVES)],
            self::NOUNS[array_rand(self::NOUNS)],
            random_int(0, max(0, $tokenRange - 1))
        );
    }
}
