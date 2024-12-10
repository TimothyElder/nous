import * as vscode from 'vscode';
import { getApiKey } from './keyHandler';

interface OpenAIResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

interface ApiError {
    message: string;
    code?: number; // Optional field for status codes
}

// Test API connection with display message
export async function testApiConnection(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Retrieve the API key from SecretStorage
        const apiKey = await getApiKey(context);

        if (!apiKey) {
            vscode.window.showErrorMessage(
                'No OpenAI API key found. Please set it using the "Nous: Set API Key" command.'
            );
            return;
        }
        const fetch = (await import("node-fetch")).default;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
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

        const data = await response.json() as OpenAIResponse
        const reply = data.choices[0].message.content.trim();

        vscode.window.showInformationMessage(`API Response: ${reply}`);
    } catch (error: unknown) {
        const apiError = error as ApiError;
        vscode.window.showErrorMessage(`Error calling OpenAI API: ${apiError.message}`);
    }
}

// Check Grammar Function 
export async function identifySpellingGrammarErrors(text: string, context: vscode.ExtensionContext): Promise<any | undefined> {
    try {
        // Ensure context is valid
        if (!context || !context.secrets) {
            vscode.window.showErrorMessage("Context is not properly initialized.");
            return;
        }

        // Retrieve the API key from SecretStorage
        const apiKey = await getApiKey(context);
        if (!apiKey) {
            vscode.window.showErrorMessage(
                'No OpenAI API key found. Please set it using the "Nous: Set API Key" command.'
            );
            return;
        }

        const fetch = (await import("node-fetch")).default;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4', // or 'gpt-3.5-turbo'
                messages: [
                    { role: 'system', content: `
                        You are an assistant that identifies spelling and grammar errors.
                        Instructions:
                        - Use zero-based indexing for positions.
                        - start_position is the index before the first character of the error.
                        - end_position is the index after the last character of the error.
                        - Return results in JSON format only.
                    `.trim() },
                    { role: 'user', content: `
                        Identify spelling and grammar errors in the following text. 
                        Return them in JSON format with the structure:
                        [
                            {
                                "error": "error text",
                                "correction": "corrected text",
                                "type": "spelling/grammar",
                                "start_position": start_index,
                                "end_position": end_index
                            }
                        ].

                        Text:
                        ${text}
                    `.trim() },
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
        const errors = data.choices[0]?.message?.content?.trim();

        if (errors.startsWith('[') && errors.endsWith(']')) {
            try {
                const errorList = JSON.parse(errors);
                return errorList;
            } catch (parseError) {
                vscode.window.showErrorMessage("Failed to parse JSON response from the API.");
                console.error("Error parsing JSON:", parseError);
                return;
            }
        } else {
            vscode.window.showErrorMessage("API response format is invalid.");
            console.error("Invalid API response:", errors);
            return;
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error calling OpenAI API: ${(error as Error).message}`);
    }
}
