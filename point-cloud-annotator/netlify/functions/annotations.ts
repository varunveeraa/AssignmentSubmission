/**
 * Annotations API - Netlify Function
 * V2: Uses Netlify Blobs for NoSQL storage
 * 
 * Endpoints:
 * GET  /.netlify/functions/annotations      - Get all annotations
 * POST /.netlify/functions/annotations      - Create annotation
 * DELETE /.netlify/functions/annotations?id=xxx - Delete annotation
 */

import { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface Annotation {
    id: string;
    position: { x: number; y: number; z: number };
    text: string;
    createdAt: number;
}

const STORE_NAME = "annotations";
const INDEX_KEY = "annotation-index";

// Helper to get all annotation IDs
async function getAnnotationIds(store: ReturnType<typeof getStore>): Promise<string[]> {
    try {
        const index = await store.get(INDEX_KEY, { type: "json" });
        return (index as string[]) || [];
    } catch {
        return [];
    }
}

// Helper to save annotation IDs
async function saveAnnotationIds(store: ReturnType<typeof getStore>, ids: string[]): Promise<void> {
    await store.setJSON(INDEX_KEY, ids);
}

export const handler: Handler = async (event) => {
    const store = getStore(STORE_NAME);
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers, body: "" };
    }

    try {
        // GET - Fetch all annotations
        if (event.httpMethod === "GET") {
            const ids = await getAnnotationIds(store);
            const annotations: Annotation[] = [];

            for (const id of ids) {
                const annotation = await store.get(id, { type: "json" });
                if (annotation) {
                    annotations.push(annotation as Annotation);
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ annotations }),
            };
        }

        // POST - Create annotation
        if (event.httpMethod === "POST") {
            if (!event.body) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Missing request body" }),
                };
            }

            const annotation: Annotation = JSON.parse(event.body);

            // Validate
            if (!annotation.id || !annotation.position || !annotation.text) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Invalid annotation data" }),
                };
            }

            // Truncate text to 256 bytes
            const encoder = new TextEncoder();
            const encoded = encoder.encode(annotation.text);
            if (encoded.length > 256) {
                const decoder = new TextDecoder();
                annotation.text = decoder.decode(encoded.slice(0, 256));
            }

            // Save annotation
            await store.setJSON(annotation.id, annotation);

            // Update index
            const ids = await getAnnotationIds(store);
            if (!ids.includes(annotation.id)) {
                ids.push(annotation.id);
                await saveAnnotationIds(store, ids);
            }

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ success: true, annotation }),
            };
        }

        // DELETE - Remove annotation
        if (event.httpMethod === "DELETE") {
            const id = event.queryStringParameters?.id;

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Missing annotation ID" }),
                };
            }

            // Delete annotation
            await store.delete(id);

            // Update index
            const ids = await getAnnotationIds(store);
            const updatedIds = ids.filter((i) => i !== id);
            await saveAnnotationIds(store, updatedIds);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
};
