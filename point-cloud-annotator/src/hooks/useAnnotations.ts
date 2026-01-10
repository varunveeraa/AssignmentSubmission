import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Annotation } from '../types/annotation';
import * as storage from '../services/storage';

export function useAnnotations() {
    // Initialize with data from localStorage directly
    const [annotations, setAnnotations] = useState<Annotation[]>(() => storage.loadAnnotations());
    const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

    const createAnnotation = useCallback((position: { x: number; y: number; z: number }, text: string) => {
        const newAnnotation: Annotation = {
            id: uuidv4(),
            position,
            text: storage.validateText(text),
            createdAt: Date.now(),
        };

        const updated = storage.addAnnotation(newAnnotation);
        setAnnotations(updated);
        return newAnnotation;
    }, []);

    const deleteAnnotation = useCallback((id: string) => {
        const updated = storage.deleteAnnotation(id);
        setAnnotations(updated);
        if (selectedAnnotation === id) {
            setSelectedAnnotation(null);
        }
    }, [selectedAnnotation]);

    const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
        const updated = storage.updateAnnotation(id, updates);
        setAnnotations(updated);
    }, []);

    const selectAnnotation = useCallback((id: string | null) => {
        setSelectedAnnotation(id);
    }, []);

    return {
        annotations,
        selectedAnnotation,
        createAnnotation,
        deleteAnnotation,
        updateAnnotation,
        selectAnnotation,
    };
}
