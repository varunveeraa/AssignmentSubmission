/**
 * Annotations API - Netlify Function
 * V2: Uses Netlify Blobs for persistent NoSQL storage
 * 
 * Endpoints:
 * GET  /.netlify/functions/annotations      - Get all annotations
 * POST /.netlify/functions/annotations      - Create annotation
 * DELETE /.netlify/functions/annotations?id=xxx - Delete annotation
 */

import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface Annotation {
    id: string;
    position: { x: number; y: number; z: number };
    text: string;
    createdAt: number;
}

const STORE_NAME = "annotations";
const INDEX_KEY = "annotation-index";

const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const handler: Handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers, body: "" };
    }

    try {
        // Initialize Netlify Blobs store
        const store = getStore(STORE_NAME);

        // GET - Fetch all annotations
        if (event.httpMethod === "GET") {
            let ids: string[] = [];
            try {
                const indexData = await store.get(INDEX_KEY, { type: "json" });
                ids = (indexData as string[]) || [];
            } catch {
                // No index yet, return empty
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ annotations: [] }),
                };
            }

            const annotations: Annotation[] = [];
            for (const id of ids) {
                try {
                    const annotation = await store.get(id, { type: "json" });
                    if (annotation) {
                        annotations.push(annotation as Annotation);
                    }
                } catch {
                    // Skip failed items
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
            if (!annotation.id || !annotation.position) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Invalid annotation data" }),
                };
            }

            // Truncate text to 256 bytes
            if (annotation.text) {
                const encoder = new TextEncoder();
                const encoded = encoder.encode(annotation.text);
                if (encoded.length > 256) {
                    const decoder = new TextDecoder();
                    annotation.text = decoder.decode(encoded.slice(0, 256));
                }
            }

            // Save annotation to Blobs
            await store.setJSON(annotation.id, annotation);

            // Update index
            let ids: string[] = [];
            try {
                const indexData = await store.get(INDEX_KEY, { type: "json" });
                ids = (indexData as string[]) || [];
            } catch {
                ids = [];
            }

            if (!ids.includes(annotation.id)) {
                ids.push(annotation.id);
                await store.setJSON(INDEX_KEY, ids);
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

            // Delete from Blobs
            await store.delete(id);

            // Update index
            let ids: string[] = [];
            try {
                const indexData = await store.get(INDEX_KEY, { type: "json" });
                ids = (indexData as string[]) || [];
            } catch {
                ids = [];
            }
            const updatedIds = ids.filter((i) => i !== id);
            await store.setJSON(INDEX_KEY, updatedIds);

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
        const message = error instanceof Error ? error.message : String(error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Server error", message }),
        };
    }
};
