import { useState, useEffect } from 'react';

export function useDragAndDrop<T>(initialItems: T[]) {
    const [items, setItems] = useState(initialItems);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const handleDragStart = (index: number) => {
        setDraggingIndex(index);
    };

    const handleDrop = (index: number) => {
        if (draggingIndex !== null) {
            const updatedItems = reorderArray(items, draggingIndex, index);
            setItems(updatedItems);
            setDraggingIndex(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    return {
        items,
        handleDragStart,
        handleDrop,
        handleDragOver,
    };
}

function reorderArray<T>(array: T[], startIndex: number, endIndex: number): T[] {
    const result = Array.from(array);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
}