/**
 * Storage Service
 * Handles annotation persistence - automatically switches between:
 * - localStorage (V1, default)
 * - REST API (V2: Netlify Blobs, V3: AWS DynamoDB)
 * 
 * Set VITE_STORAGE_PROVIDER=api to use backend
 */

import type { Annotation, AnnotationStore } from '../types/annotation';
import { STORAGE } from '../constants';

const USE_API = import.meta.env.VITE_STORAGE_PROVIDER === 'api';
const API_URL = import.meta.env.VITE_API_URL || '/.netlify/functions/annotations';
const DEFAULT_SCENE_ID = 'lion'; // Default scene for the lion point cloud

/**
 * Validates and truncates text to fit within byte limit.
 */
export function validateText(text: string): string {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);

    if (encoded.length <= STORAGE.MAX_TEXT_BYTES) {
        return text;
    }

    const decoder = new TextDecoder();
    let truncated = encoded.slice(0, STORAGE.MAX_TEXT_BYTES);

    while (truncated.length > 0) {
        try {
            return decoder.decode(truncated);
        } catch {
            truncated = truncated.slice(0, -1);
        }
    }

    return '';
}

// ============================================
// localStorage Implementation (V1)
// ============================================

function loadFromLocalStorage(): Annotation[] {
    try {
        const data = localStorage.getItem(STORAGE.KEY);
        if (!data) return [];
        const store: AnnotationStore = JSON.parse(data);
        return store.annotations || [];
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return [];
    }
}

function saveToLocalStorage(annotations: Annotation[]): void {
    try {
        const store: AnnotationStore = { annotations, version: STORAGE.VERSION };
        localStorage.setItem(STORAGE.KEY, JSON.stringify(store));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

// ============================================
// API Implementation (V2/V3)
// ============================================

async function loadFromAPI(): Promise<Annotation[]> {
    try {
        // Include sceneId for efficient Query instead of Scan
        const response = await fetch(`${API_URL}?sceneId=${encodeURIComponent(DEFAULT_SCENE_ID)}`);
        if (!response.ok) {
            const error = await response.text();
            console.error('API Error (Load):', error);
            throw new Error(`HTTP ${response.status}: ${error}`);
        }
        const data = await response.json();
        return data.annotations || data || [];
    } catch (error) {
        console.error('Failed to load from API:', error);
        return [];
    }
}

async function addToAPI(annotation: Annotation): Promise<void> {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotation),
    });
    if (!response.ok) {
        const error = await response.text();
        console.error('API Error (Add):', error);
        throw new Error(`HTTP ${response.status}: ${error}`);
    }
}

async function deleteFromAPI(id: string): Promise<void> {
    // Include sceneId for composite key delete
    const response = await fetch(`${API_URL}?sceneId=${encodeURIComponent(DEFAULT_SCENE_ID)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) {
        const error = await response.text();
        console.error('API Error (Delete):', error);
        throw new Error(`HTTP ${response.status}: ${error}`);
    }
}

// ============================================
// Public API (auto-switches based on config)
// ============================================

export async function loadAnnotations(): Promise<Annotation[]> {
    if (USE_API) {
        return loadFromAPI();
    }
    return loadFromLocalStorage();
}

export async function addAnnotation(annotation: Annotation): Promise<Annotation[]> {
    const validated = { ...annotation, text: validateText(annotation.text) };

    if (USE_API) {
        await addToAPI(validated);
        return loadFromAPI();
    }

    const annotations = loadFromLocalStorage();
    annotations.push(validated);
    saveToLocalStorage(annotations);
    return annotations;
}

export async function deleteAnnotation(id: string): Promise<Annotation[]> {
    if (USE_API) {
        await deleteFromAPI(id);
        return loadFromAPI();
    }

    const annotations = loadFromLocalStorage().filter(a => a.id !== id);
    saveToLocalStorage(annotations);
    return annotations;
}

export async function updateAnnotation(id: string, updates: Partial<Annotation>): Promise<Annotation[]> {
    if (USE_API) {
        // For API, we'd need a PATCH endpoint - for now just reload
        // This will be implemented when we build the backend
        console.warn('updateAnnotation via API not yet implemented');
        return loadFromAPI();
    }

    const annotations = loadFromLocalStorage().map(a => {
        if (a.id === id) {
            return { ...a, ...updates, text: updates.text ? validateText(updates.text) : a.text };
        }
        return a;
    });
    saveToLocalStorage(annotations);
    return annotations;
}

/**
 * Returns the current storage mode for UI display.
 */
export function getStorageMode(): { badge: string; label: string } {
    return USE_API
        ? { badge: 'V3', label: '☁️ Cloud Sync' }
        : { badge: 'V1', label: '💾 localStorage' };
}
