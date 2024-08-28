import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import Openai from 'openai';

const systemPrompt = `
You are an intelligent assistant designed to help students find the best professors according to their specific needs and preferences. When a student asks about professors, you will:

1. Understand the Query: Analyze the student's question to determine their preferences (e.g., subject, teaching style, grading difficulty, etc.).

2. Retrieve Information: Use a Retrieval-Augmented Generation (RAG) model to search through a database of professor reviews, ratings, and relevant data.

3. Rank and Recommend: Select and rank the top 3 professors who best match the student's criteria. Provide a brief summary of each professor, highlighting their strengths and any relevant feedback from previous students.

4. Clarify and Assist: If the student's query is unclear or requires more detail, ask follow-up questions to ensure accurate recommendations.

5. Be Objective and Neutral: Base your recommendations solely on the data retrieved, and avoid any bias or assumptions not supported by the information available.

6. Provide Accurate and Relevant Information: Ensure that all recommendations are up-to-date and directly relevant to the student's query. If no suitable professors are found, suggest alternatives or ways to refine the search.
`;

export async function POST(req) {
    const data = await req.json();  
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,  
    });

    const index = pc.index('rag').namespace('ns1');
    const openai = new Openai({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const text = data[data.length - 1].content;
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
    });

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
    });

    let resultString = 'Returned results from vector db (done automatically):\n';
    results.matches.forEach((match) => {
        resultString += `
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n`;
    });

    const lastMessageContent = data[data.length - 1].content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    const completion = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            ...lastDataWithoutLastMessage,
            { role: 'user', content: lastMessageContent },
        ],
        model: 'gpt-4-0314',
        stream: true,
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch (error) {
                controller.error(error);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream);
}
