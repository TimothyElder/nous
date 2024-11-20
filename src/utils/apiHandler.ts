import * as vscode from 'vscode';

// Test API connection with display message

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

// Check Grammar Function 
export async function identifySpellingGrammarErrors(text: string): Promise<any | undefined> {
    try {
        const fetch = (await import("node-fetch")).default;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4', // or 'gpt-3.5-turbo'
                messages: [
                    { role: 'system', content: "You are an assistant that identifies spelling and grammar errors." },
                    { role: 'user', content: `Identify spelling and grammar errors in the following text, and return them in JSON format with the structure: [{"error": "error text", "correction": "corrected text", "type": "spelling/grammar", "position": start_position}]. Text:\n\n${text}` },
                ],
                max_tokens: 500,
                temperature: 0.2,
            }),
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            vscode.window.showErrorMessage(`OpenAI API request failed: ${errorDetails}`);
            return;
        }

        const data = await response.json();
        const errors = data.choices[0].message.content.trim();

        // Parse JSON response from the API (if the response format is correct)
        try {
            const errorList = JSON.parse(errors);
            return errorList;
        } catch (parseError) {
            vscode.window.showErrorMessage("Failed to parse JSON response from the API.");
            console.error("Error parsing JSON:", parseError);
            return;
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error calling OpenAI API: ${error.message}`);
    }
}