import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslator } from '@/lib/i18n';
import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

export interface Tag {
    id: string;
    name: string;
    slug: string;
    color: string | null;
}

interface Props {
    /** Current tags on the entity. */
    tags: Tag[];
    attachableType: string;
    attachableId: string;
    /** All available workspace tags for autocomplete. */
    availableTags?: Tag[];
}

/** Stable empty-array default so the memoized suggestions don't recompute every render. */
const EMPTY_TAGS: Tag[] = [];

/**
 * Tag input with autocomplete. On submit syncs full tag list via POST /tags/sync.
 * Creates new tags on-the-fly (server deduplicates by slug).
 * Prop `tags` is the initial set — entity page owns state via Inertia reload.
 */
export default function TagInput({ tags: initialTags, attachableType, attachableId, availableTags = EMPTY_TAGS }: Props) {
    const t = useTranslator();
    const [selected, setSelected] = useState<string[]>(initialTags.map((t) => t.name));
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const suggestions = useMemo<Tag[]>(() => {
        const query = inputValue.trim().toLowerCase();
        if (query.length === 0) return EMPTY_TAGS;
        return availableTags.filter((tag) => tag.name.toLowerCase().includes(query) && !selected.includes(tag.name));
    }, [inputValue, availableTags, selected]);

    const addTag = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed || selected.includes(trimmed)) return;
        const updated = [...selected, trimmed];
        setSelected(updated);
        setInputValue('');
        syncTags(updated);
    };

    const removeTag = (name: string) => {
        const updated = selected.filter((s) => s !== name);
        setSelected(updated);
        syncTags(updated);
    };

    const syncTags = (tagNames: string[]) => {
        router.post(route('tags.sync'), { attachable_type: attachableType, attachable_id: attachableId, tags: tagNames }, { preserveScroll: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue);
        }
        if (e.key === 'Backspace' && inputValue === '' && selected.length > 0) {
            removeTag(selected[selected.length - 1]);
        }
    };

    return (
        <div className="focus-within:ring-ring flex flex-wrap gap-1 rounded-md border p-2 focus-within:ring-1">
            {selected.map((name) => {
                const tag = availableTags.find((t) => t.name === name);
                return (
                    <span
                        key={name}
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={tag?.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}
                    >
                        {name}
                        <button type="button" onClick={() => removeTag(name)} className="hover:opacity-75">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                );
            })}
            <div className="relative flex-1">
                <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => inputValue.trim() && addTag(inputValue)}
                    placeholder={selected.length === 0 ? t('tags.search_tags') : ''}
                    className="h-6 border-none p-0 text-sm shadow-none focus-visible:ring-0"
                />
                {suggestions.length > 0 && (
                    <ul className="bg-background absolute top-full left-0 z-10 mt-1 w-48 rounded-md border shadow-md">
                        {suggestions.map((tag) => (
                            <li key={tag.id}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-sm"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        addTag(tag.name);
                                    }}
                                >
                                    {tag.name}
                                </Button>
                            </li>
                        ))}
                        {inputValue.trim() && !availableTags.some((t) => t.name.toLowerCase() === inputValue.toLowerCase()) && (
                            <li>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground w-full justify-start text-sm"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        addTag(inputValue);
                                    }}
                                >
                                    {t('tags.create_tag', { name: inputValue })}
                                </Button>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}
