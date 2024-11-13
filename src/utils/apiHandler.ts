import * as vscode from 'vscode';

export async function testApiConnection(): Promise<void> {
    try {
        const fetch = (await import("node-fetch")).default;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', // or 'gpt-4'
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
            vscode.window.showErrorMessage(`OpenAI API request failed: ${errorDetails}`);
            return;
        }

        const data = await response.json();
        const reply = data.choices[0].message.content.trim();

        // Display the response in a pop-up message
        vscode.window.showInformationMessage(`API Response: ${reply}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error calling OpenAI API: ${error.message}`);
    }
}