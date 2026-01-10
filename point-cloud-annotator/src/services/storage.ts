import type { Annotation, AnnotationStore } from '../types/annotation';

const STORAGE_KEY = 'point-cloud-annotations';
const MAX_TEXT_BYTES = 256;

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

export function saveAnnotations(annotations: Annotation[]): void {
    try {
        const store: AnnotationStore = {
            annotations,
            version: 1,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
        console.error('Failed to save annotations:', error);
    }
}

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

export function deleteAnnotation(id: string): Annotation[] {
    const annotations = loadAnnotations().filter(a => a.id !== id);
    saveAnnotations(annotations);
    return annotations;
}

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
