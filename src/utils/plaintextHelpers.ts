import * as vscode from 'vscode';

export const removeNewlinesCommand = vscode.commands.registerCommand('nous.removeNewlines', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const selection = editor.selection;
        const selectedText = document.getText(selection);
        const processedText = selectedText.replace(/\n/g, ' ');
        editor.edit(editBuilder => editBuilder.replace(selection, processedText));
    }
});

export const anonymizeCommand = vscode.commands.registerCommand('nous.Anonymize', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const selection = editor.selection;
        const selectedText = document.getText(selection);
        const processedText = selectedText.replace(/\w/g, '_');
        editor.edit(editBuilder => editBuilder.replace(selection, processedText));
    }
});