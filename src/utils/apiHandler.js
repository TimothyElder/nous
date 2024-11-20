import * as vscode from 'vscode';
import fetch from 'node-fetch';

async function checkSpellingAndGrammar(text) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4', // or 'gpt-3.5-turbo'
                messages: [
                    { role: 'system', content: "You are a grammar and spelling checker." },
                    { role: 'user', content: `Correct the grammar and spelling of the following text:\n\n${text}` },
                ],
                max_tokens: 500,
                temperature: 0.2, // Low temperature for more deterministic responses
            }),
        });
        if (!response.ok) {
            const errorDetails = await response.text();
            vscode.window.showErrorMessage(`OpenAI API request failed: ${errorDetails}`);
            return;
        }
        const data = await response.json();
        const correctedText = data.choices[0].message.content.trim();
        return correctedText;
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error calling OpenAI API: ${error.message}`);
    }
}
export async function testApiConnection() {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4', // or 'gpt-3.5-turbo'
                messages: [
                    { role: 'system', content: "You are an assistant." },
                    { role: 'user', content: "Hello, can you confirm our connection?" },
                ],
                max_tokens: 50,
                temperature: 0.2,
            }),
        });
        if (!response.ok) {
            const errorDetails = await response.text();
            console.error(`OpenAI API request failed: ${errorDetails}`);
            return;
        }
        const data = await response.json();
        const reply = data.choices[0].message.content.trim();
        console.log(`API Response: ${reply}`);
    }
    catch (error) {
        console.error(`Error calling OpenAI API: ${error.message}`);
    }
}
//# sourceMappingURL=apiHandler.js.map