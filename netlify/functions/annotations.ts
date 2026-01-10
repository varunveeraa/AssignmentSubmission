/**
 * Annotations API - Netlify Function
 * V2: Simple in-memory storage for testing
 * 
 * Note: This stores data in memory - will reset on each deploy/cold start
 * TODO: Switch back to Netlify Blobs once confirmed working
 */

import type { Handler } from "@netlify/functions";

interface Annotation {
    id: string;
    position: { x: number; y: number; z: number };
    text: string;
    createdAt: number;
}

// In-memory storage (temporary for debugging)
// In production, this would use Netlify Blobs
const annotations: Map<string, Annotation> = new Map();

const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const handler: Handler = async (event) => {
    console.log("Function invoked:", event.httpMethod);

    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers, body: "" };
    }

    try {
        // GET - Fetch all annotations
        if (event.httpMethod === "GET") {
            const allAnnotations = Array.from(annotations.values());
            console.log("GET: Returning", allAnnotations.length, "annotations");
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ annotations: allAnnotations }),
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
            console.log("POST: Creating annotation:", annotation.id);

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

            // Save annotation
            annotations.set(annotation.id, annotation);
            console.log("POST: Saved. Total annotations:", annotations.size);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ success: true, annotation }),
            };
        }

        // DELETE - Remove annotation
        if (event.httpMethod === "DELETE") {
            const id = event.queryStringParameters?.id;
            console.log("DELETE: Removing annotation:", id);

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Missing annotation ID" }),
                };
            }

            annotations.delete(id);
            console.log("DELETE: Done. Remaining:", annotations.size);

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
