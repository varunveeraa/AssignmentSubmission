/**
 * useAnnotations Hook
 * Manages annotation state with async storage operations.
 */

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Annotation } from '../types/annotation';
import * as storage from '../services/storage';

// Default scene ID for the lion point cloud
const DEFAULT_SCENE_ID = 'lion';

export function useAnnotations() {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load annotations on mount
    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                setIsLoading(true);
                const data = await storage.loadAnnotations();
                if (mounted) setAnnotations(data);
            } catch (err) {
                if (mounted) setError(err instanceof Error ? err.message : 'Failed to load');
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        load();
        return () => { mounted = false; };
    }, []);

    const createAnnotation = useCallback(async (
        position: { x: number; y: number; z: number },
        text: string
    ) => {
        const newAnnotation: Annotation = {
            id: uuidv4(),
            sceneId: DEFAULT_SCENE_ID,
            position,
            text: storage.validateText(text),
            createdAt: Date.now(),
        };

        try {
            const updated = await storage.addAnnotation(newAnnotation);
            setAnnotations(updated);
            return newAnnotation;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create');
            throw err;
        }
    }, []);

    const deleteAnnotation = useCallback(async (id: string) => {
        // Optimistic update: immediately remove from UI
        const previousAnnotations = annotations;
        setAnnotations(prev => prev.filter(a => a.id !== id));
        if (selectedAnnotation === id) setSelectedAnnotation(null);

        try {
            await storage.deleteAnnotation(id);
        } catch (err) {
            // Rollback on error
            setAnnotations(previousAnnotations);
            setError(err instanceof Error ? err.message : 'Failed to delete');
            throw err;
        }
    }, [annotations, selectedAnnotation]);

    const updateAnnotation = useCallback(async (id: string, updates: Partial<Annotation>) => {
        try {
            const updated = await storage.updateAnnotation(id, updates);
            setAnnotations(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update');
            throw err;
        }
    }, []);

    const selectAnnotation = useCallback((id: string | null) => {
        setSelectedAnnotation(id);
    }, []);

    return {
        annotations,
        selectedAnnotation,
        isLoading,
        error,
        createAnnotation,
        deleteAnnotation,
        updateAnnotation,
        selectAnnotation,
    };
}
