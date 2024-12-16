import * as vscode from 'vscode';
import { getApiKey } from './keyHandler';

const fetch = require('node-fetch');

const configuration = vscode.workspace.getConfiguration('nous');
// const llamaEndpoint = configuration.get<string>('llamaEndpoint');
// const backend = configuration.get<string>('backend');

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

    export async function setBackendCommand(): Promise<void> {
        console.log('Registered command: nous.setBackend');
        const llms = ['openai', 'llama'];
        const backend = await vscode.window.showQuickPick(llms, {
            placeHolder: 'Select the backend for Nous',
        });
    
        if (backend) {
            await vscode.workspace.getConfiguration('nous').update('backend', backend, true);
            vscode.window.showInformationMessage(`Backend set to ${backend}.`);
        }
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

export async function identifySpellingGrammarErrors(
    text: string,
    context: vscode.ExtensionContext
): Promise<any> {
    const backend = configuration.get<string>('backend') || 'openai';
    const apiKey = backend === 'openai'
        ? await getApiKey(context)
        : undefined; // Explicitly set to undefined if not openai
    const endpoint = backend === 'llama'
        ? configuration.get<string>('llamaEndpoint') || undefined // Convert null to undefined
        : undefined;

    try {
        return await callGrammarChecker(text, backend as 'openai' | 'llama', { apiKey, endpoint }, context);
    } catch (error) {
        vscode.window.showErrorMessage(`Error calling grammar checker: ${(error as Error).message}`);
        return null;
    }
}

export async function callGrammarChecker(
    text: string,
    backend: 'openai' | 'llama',
    options: { apiKey?: string; endpoint?: string },
    context: vscode.ExtensionContext
): Promise<any> {
    if (backend === 'openai') {
        return callOpenAI(text, context);
    } else if (backend === 'llama') {
        if (!options.endpoint) throw new Error('Llama endpoint is missing.');
        return callLlama(text, context);
    } else {
        throw new Error('Invalid backend specified.');
    }
}

// send text to openai backend
export async function callOpenAI(text: string, context: vscode.ExtensionContext): Promise<any | undefined> {
    console.log('Calling openai');
    vscode.window.showInformationMessage('Using OpenAI');
    try {
        // Ensure context is valid, I don't think this is really needed anymore.
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
                max_tokens: 5000,
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

export async function callLlama(text: string, context: vscode.ExtensionContext): Promise<any | undefined> {
    vscode.window.showInformationMessage('Using Llama');
    try {
        // Retrieve the endpoint from the settings
        const endpoint = vscode.workspace.getConfiguration('nous').get<string>('llamaEndpoint');

        if (!endpoint) {
            vscode.window.showErrorMessage('Llama endpoint is not configured in the settings.');
            return;
        }

        const fetch = (await import("node-fetch")).default;

        // Perform the API call
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3.2', // Specify the desired Llama model
                messages: [
                    {
                        role: 'system',
                        content: `
                            You are an assistant that identifies spelling and grammar errors.
                            Instructions:
                            - Use zero-based indexing for positions.
                            - start_position is the index before the first character of the error.
                            - end_position is the index after the last character of the error.
                            - Return results in JSON format only.
                            - in the error field of the returned JSON structure, only include the original string that had the error. No explanation.
                            - in the correction field of the returned JSON structure, only include the proposed corrected string. No explanation.
                        `.trim(),
                    },
                    {
                        role: 'user',
                        content: `
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
                        `.trim(),
                    },
                ],
                stream: false, // Disable streaming to receive the full response
            }),
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            vscode.window.showErrorMessage(`Llama request failed: ${errorDetails}`);
            return;
        }

        // Parse the JSON response
        const data = await response.json();
        console.log('Raw Llama API response:', data);

        // Extract the content from the assistant's message
        const rawContent = data.message?.content?.trim();

        if (!rawContent) {
            vscode.window.showErrorMessage("Llama API response is missing content.");
            return;
        }

        // Validate and parse the JSON string within the content
        if (rawContent.startsWith('[') && rawContent.endsWith(']')) {
            try {
                const errorList = JSON.parse(rawContent);
                return errorList;
            } catch (parseError) {
                vscode.window.showErrorMessage("Failed to parse JSON from Llama API response.");
                console.error("Error parsing JSON:", parseError, rawContent);
                return;
            }
        } else {
            vscode.window.showErrorMessage("Llama API response format is invalid.");
            console.error("Invalid API response:", rawContent);
            return;
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error calling Llama API: ${(error as Error).message}`);
        console.error(error);
    }
}