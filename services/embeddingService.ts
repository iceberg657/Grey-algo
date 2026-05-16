
import { GoogleGenAI } from "@google/genai";
import { executeLaneCall, getAnalysisPool } from './retryUtils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, getDocs, limit, orderBy } from 'firebase/firestore';

/**
 * GreyAlpha Embedding Service
 * Uses gemini-embedding-2-preview for strategy indexing and retrieval.
 */

export interface KnowledgeEntry {
    content: string;
    metadata: any;
    embedding?: number[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
    return await executeLaneCall<number[]>(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
        
        const result = await model.embedContent(text);
        return result.embedding.values;
    }, getAnalysisPool);
}

export async function storeStrategyKnowledge(content: string, metadata: any) {
    try {
        const vector = await generateEmbedding(content);
        const docRef = await addDoc(collection(db, 'neural_knowledge'), {
            content,
            metadata,
            embedding: vector,
            timestamp: new Date().getTime()
        });
        return docRef.id;
    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'neural_knowledge');
    }
}

/**
 * Basic "Semantic Search" using cosine similarity (client-side)
 * Note: For production, use a vector database. This is a prototype implementation.
 */
export async function findSimilarStrategies(queryText: string, topK: number = 3): Promise<KnowledgeEntry[]> {
    try {
        const queryVector = await generateEmbedding(queryText);
        const snapshot = await getDocs(query(collection(db, 'neural_knowledge'), limit(50), orderBy('timestamp', 'desc')));
        
        const results = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                content: data.content,
                metadata: data.metadata,
                embedding: data.embedding,
                similarity: cosineSimilarity(queryVector, data.embedding)
            };
        });

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
            .map(({ content, metadata }) => ({ content, metadata }));
            
    } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'neural_knowledge');
        return [];
    }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
