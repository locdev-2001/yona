import { useKeyboardEvents } from './useKeyboardEvents';

// Port từ dashboard/composables/useKeyboardNavigableList.js — điều hướng danh sách
// bằng ArrowUp/ArrowDown (+ Control+P/N) và chọn bằng Enter, chỉ chặn phím khi
// danh sách có phần tử.

export function updateSelectionIndex(currentIndex: number, itemsLength: number, direction: 'up' | 'down'): number {
    if (direction === 'up') {
        return currentIndex === 0 ? itemsLength - 1 : currentIndex - 1;
    }
    return currentIndex === itemsLength - 1 ? 0 : currentIndex + 1;
}

interface KeyboardNavigableListOptions {
    itemCount: number;
    selectedIndex: number;
    onSelectedIndexChange: (index: number) => void;
    onSelect?: () => void;
    adjustScroll: () => void;
}

export function useKeyboardNavigableList({
    itemCount,
    selectedIndex,
    onSelectedIndexChange,
    onSelect,
    adjustScroll,
}: KeyboardNavigableListOptions): { moveSelectionUp: () => void; moveSelectionDown: () => void } {
    const moveSelection = (direction: 'up' | 'down') => {
        if (!itemCount) return;
        onSelectedIndexChange(updateSelectionIndex(selectedIndex, itemCount, direction));
        adjustScroll();
    };

    const moveSelectionUp = () => moveSelection('up');
    const moveSelectionDown = () => moveSelection('down');

    const createAction = (action: () => void) => ({
        action: (event: KeyboardEvent) => {
            if (!itemCount) return;
            action();
            event.preventDefault();
        },
        allowOnFocusedInput: true,
    });

    useKeyboardEvents({
        ArrowUp: createAction(moveSelectionUp),
        'Control+KeyP': createAction(moveSelectionUp),
        ArrowDown: createAction(moveSelectionDown),
        'Control+KeyN': createAction(moveSelectionDown),
        ...(onSelect ? { Enter: createAction(onSelect) } : {}),
    });

    return { moveSelectionUp, moveSelectionDown };
}
