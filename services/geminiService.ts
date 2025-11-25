/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { RagStore, Document, QueryResult, CustomMetadata } from '../types';

let ai: GoogleGenAI;

export function initialize(apiKey?: string) {
    const key = apiKey || process.env.API_KEY;
    if (!key) {
        throw new Error("Clave API no encontrada. Por favor selecciónala o ingrésala.");
    }
    ai = new GoogleGenAI({ apiKey: key });
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createRagStore(displayName: string): Promise<string> {
    if (!ai) throw new Error("Gemini AI no inicializado");
    const ragStore = await ai.fileSearchStores.create({ config: { displayName } });
    if (!ragStore.name) {
        throw new Error("Fallo al crear la base de conocimiento: falta el nombre.");
    }
    return ragStore.name;
}

export async function uploadToRagStore(ragStoreName: string, file: File): Promise<void> {
    if (!ai) throw new Error("Gemini AI no inicializado");
    
    let op = await ai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: ragStoreName,
        file: file
    });

    while (!op.done) {
        await delay(3000);
        op = await ai.operations.get({operation: op});
    }
}

export async function fileSearch(ragStoreName: string, query: string): Promise<QueryResult> {
    if (!ai) throw new Error("Gemini AI no inicializado");
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query + " Responde siempre en Español. NO PIDAS AL USUARIO QUE LEA EL MANUAL, señala las secciones relevantes en la respuesta misma.",
        config: {
            tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
        }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return {
        text: response.text,
        groundingChunks: groundingChunks,
    };
}

export async function generateExampleQuestions(ragStoreName: string): Promise<string[]> {
    if (!ai) throw new Error("Gemini AI no inicializado");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "You are provided some user manuals for some products. Figure out for what product each manual is for, based on the cover page contents. DO NOT GUESS OR HALLUCINATE THE PRODUCT. Then, for each product, generate 4 short and practical example questions a user might ask about it in Spanish. Return the questions as a JSON array of objects. Each object should have a 'product' key with the product name as a string, and a 'questions' key with an array of 4 question strings. For example: ```json[{\"product\": \"Product A\", \"questions\": [\"q1\", \"q2\"]}, {\"product\": \"Product B\", \"questions\": [\"q3\", \"q4\"]}]```",
            config: {
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
            }
        });
        
        let jsonText = response.text.trim();

        const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        } else {
            const firstBracket = jsonText.indexOf('[');
            const lastBracket = jsonText.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                jsonText = jsonText.substring(firstBracket, lastBracket + 1);
            }
        }
        
        const parsedData = JSON.parse(jsonText);
        
        if (Array.isArray(parsedData)) {
            if (parsedData.length === 0) {
                return [];
            }
            const firstItem = parsedData[0];

            // Handle new format: array of {product, questions[]}
            if (typeof firstItem === 'object' && firstItem !== null && 'questions' in firstItem && Array.isArray(firstItem.questions)) {
                return parsedData.flatMap(item => (item.questions || [])).filter(q => typeof q === 'string');
            }
            
            // Handle old format: array of strings
            if (typeof firstItem === 'string') {
                return parsedData.filter(q => typeof q === 'string');
            }
        }
        
        console.warn("Received unexpected format for example questions:", parsedData);
        return [];
    } catch (error) {
        console.error("Failed to generate or parse example questions:", error);
        return [];
    }
}


export async function deleteRagStore(ragStoreName: string): Promise<void> {
    if (!ai) throw new Error("Gemini AI no inicializado");
    // DO: Remove `(as any)` type assertion.
    await ai.fileSearchStores.delete({
        name: ragStoreName,
        config: { force: true },
    });
}