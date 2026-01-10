import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "Annotations";

interface Annotation {
    id: string;
    position: { x: number; y: number; z: number };
    text: string;
    createdAt: number;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    console.log("Event:", JSON.stringify(event));

    const httpMethod = event.requestContext.http.method;
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    try {
        if (httpMethod === "OPTIONS") {
            return { statusCode: 204, headers, body: "" };
        }

        // GET /annotations - Scan table
        if (httpMethod === "GET") {
            const command = new ScanCommand({
                TableName: TABLE_NAME,
            });

            const response = await docClient.send(command);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ annotations: response.Items || [] }),
            };
        }

        // POST /annotations - Create item
        if (httpMethod === "POST") {
            if (!event.body) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing body" }) };
            }

            const annotation = JSON.parse(event.body) as Annotation;

            // Basic validation
            if (!annotation.id || !annotation.position) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid data" }) };
            }

            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: annotation,
            });

            await docClient.send(command);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ success: true, annotation }),
            };
        }

        // DELETE /annotations?id=xxx
        if (httpMethod === "DELETE") {
            const id = event.queryStringParameters?.id;
            if (!id) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing ID" }) };
            }

            const command = new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { id },
            });

            await docClient.send(command);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, id }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };

    } catch (err) {
        console.error("Error:", err);
        const message = err instanceof Error ? err.message : String(err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal Server Error", details: message }),
        };
    }
};
