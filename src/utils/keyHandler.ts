import * as vscode from 'vscode';

const API_KEY_SECRET_KEY = 'nous.openaiAPIkey'; // Unique key for storing the secret

// Command to set the API key
export async function setApiKeyCommand(context: vscode.ExtensionContext): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your OpenAI API key',
        ignoreFocusOut: true,
        password: true, // Mask the input for security
    });

    if (!apiKey) {
        vscode.window.showErrorMessage('API key input was canceled.');
        return;
    }

    // Store the key securely
    await context.secrets.store(API_KEY_SECRET_KEY, apiKey);
    vscode.window.showInformationMessage('OpenAI API key has been securely saved.');
}

// Retrieve the API key securely
export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    return context.secrets.get(API_KEY_SECRET_KEY);
}

// Command to clear the stored API key
export async function clearApiKeyCommand(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete(API_KEY_SECRET_KEY);
    vscode.window.showInformationMessage('OpenAI API key has been removed.');
}