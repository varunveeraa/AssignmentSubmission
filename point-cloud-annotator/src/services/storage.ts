/**
 * Storage Service
 * Handles persistence of annotations to localStorage with validation
 */

import type { Annotation, AnnotationStore } from '../types/annotation';
import { STORAGE } from '../constants';

const STORAGE_KEY = STORAGE.KEY;
const MAX_TEXT_BYTES = STORAGE.MAX_TEXT_BYTES;

/**
 * Validates and truncates text to fit within byte limit.
 * Handles multi-byte UTF-8 characters safely.
 * @param text - The input text to validate
 * @returns Truncated text that fits within MAX_TEXT_BYTES (256 bytes)
 */
export function validateText(text: string): string {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);

    if (encoded.length <= MAX_TEXT_BYTES) {
        return text;
    }

    // Truncate to fit within byte limit
    const decoder = new TextDecoder();
    let truncated = encoded.slice(0, MAX_TEXT_BYTES);

    // Handle potential multi-byte character cut-off
    while (truncated.length > 0) {
        try {
            return decoder.decode(truncated);
        } catch {
            truncated = truncated.slice(0, -1);
        }
    }

    return '';
}

/**
 * Loads all annotations from localStorage.
 * @returns Array of annotations, or empty array if none exist or on error
 */
export function loadAnnotations(): Annotation[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const store: AnnotationStore = JSON.parse(data);
        return store.annotations || [];
    } catch (error) {
        console.error('Failed to load annotations:', error);
        return [];
    }
}

/**
 * Saves annotations to localStorage.
 * @param annotations - Array of annotations to persist
 */
export function saveAnnotations(annotations: Annotation[]): void {
    try {
        const store: AnnotationStore = {
            annotations,
            version: STORAGE.VERSION,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
        console.error('Failed to save annotations:', error);
    }
}

/**
 * Adds a new annotation and persists to storage.
 * @param annotation - The annotation to add
 * @returns Updated array of all annotations
 */
export function addAnnotation(annotation: Annotation): Annotation[] {
    const annotations = loadAnnotations();
    const validatedAnnotation = {
        ...annotation,
        text: validateText(annotation.text),
    };
    annotations.push(validatedAnnotation);
    saveAnnotations(annotations);
    return annotations;
}

/**
 * Deletes an annotation by ID and persists the change.
 * @param id - The unique identifier of the annotation to delete
 * @returns Updated array of remaining annotations
 */
export function deleteAnnotation(id: string): Annotation[] {
    const annotations = loadAnnotations().filter(a => a.id !== id);
    saveAnnotations(annotations);
    return annotations;
}

/**
 * Updates an existing annotation and persists the change.
 * @param id - The unique identifier of the annotation to update
 * @param updates - Partial annotation object with fields to update
 * @returns Updated array of all annotations
 */
export function updateAnnotation(id: string, updates: Partial<Annotation>): Annotation[] {
    const annotations = loadAnnotations().map(a => {
        if (a.id === id) {
            return {
                ...a,
                ...updates,
                text: updates.text ? validateText(updates.text) : a.text,
            };
        }
        return a;
    });
    saveAnnotations(annotations);
    return annotations;
}
