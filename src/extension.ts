import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { testApiConnection, identifySpellingGrammarErrors } from './utils/apiHandler';
import { setApiKeyCommand, clearApiKeyCommand } from './utils/keyHandler';
import { removeNewlinesCommand, anonymizeCommand, compileMarkdownCommand } from './utils/plaintextHelpers';

// Store error ranges globally for access across commands
const errorRanges: { range: vscode.Range; correction: string; decorationType: vscode.TextEditorDecorationType }[] = [];

export function activate(context: vscode.ExtensionContext) {
    console.log('Nous extension is now active!');

    // Register commands
    const helloWorldCommand = vscode.commands.registerCommand('nous.helloWorld', () => {
        vscode.window.showInformationMessage("I'm Nous! Here to help you.");
    });

    // Command to identify spelling and grammar errors, STRING MATCH
    const identifyErrorsCommand = vscode.commands.registerCommand('nous.identifyErrors', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
    
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
    
        if (!selectedText) {
            vscode.window.showErrorMessage('No text selected.');
            return;
        }
    
        vscode.window.showInformationMessage('Identifying spelling and grammar errors...');
        const errors = await identifySpellingGrammarErrors(selectedText, context);
    
        if (errors && Array.isArray(errors)) {
            // Clear previous decorations
            const spellingErrorDecoration = vscode.window.createTextEditorDecorationType({ textDecoration: 'underline wavy red' });
            const grammarErrorDecoration = vscode.window.createTextEditorDecorationType({ textDecoration: 'underline wavy green' });
    
            const spellingDecorations: vscode.DecorationOptions[] = [];
            const grammarDecorations: vscode.DecorationOptions[] = [];
            errorRanges.length = 0; // Reset stored errors
    
            let startSearch = 0; // Tracks where to start searching in the text for string matches
    
            for (const error of errors) {
                const errorText = error.error;          // Text with the error
                const errorCorrection = error.correction; // Suggested correction
    
                // Find the position of the error text in the selected text
                const startOffset = selectedText.indexOf(errorText, startSearch);
                if (startOffset === -1) {
                    console.warn(`Error text not found in selection: ${errorText}`);
                    continue; // Skip if the error text cannot be found
                }
    
                // Calculate the range for the error
                const endOffset = startOffset + errorText.length;
                const start = editor.document.positionAt(selection.start.character + startOffset);
                const end = editor.document.positionAt(selection.start.character + endOffset);
                const range = new vscode.Range(start, end);
    
                // Update startSearch to avoid matching the same occurrence multiple times
                startSearch = endOffset;
    
                // Create decoration for this error
                const decoration: vscode.DecorationOptions = {
                    range,
                    hoverMessage: `Error: "${errorText}"\nCorrection: "${errorCorrection}"`,
                };
    
                if (error.type === 'spelling') {
                    spellingDecorations.push(decoration);
                    errorRanges.push({ range, correction: errorCorrection, decorationType: spellingErrorDecoration });
                } else if (error.type === 'grammar') {
                    grammarDecorations.push(decoration);
                    errorRanges.push({ range, correction: errorCorrection, decorationType: grammarErrorDecoration });
                }
            }
    
            // Apply decorations
            editor.setDecorations(spellingErrorDecoration, spellingDecorations);
            editor.setDecorations(grammarErrorDecoration, grammarDecorations);
    
            vscode.window.showInformationMessage("Spelling and grammar check completed. Hover over errors to see suggestions.");
        } else {
            vscode.window.showInformationMessage("No errors found or failed to retrieve errors.");
        }
    });

    // Register Code Action Provider to enable Light Bulb suggestions
    const codeActionProvider = vscode.languages.registerCodeActionsProvider('*', {
        provideCodeActions(document, range, context) {
            const actions: vscode.CodeAction[] = [];
            const error = errorRanges.find(err => err.range.contains(range.start));
            
            if (error) {
                const acceptAction = new vscode.CodeAction(`Accept Correction: ${error.correction}`, vscode.CodeActionKind.QuickFix);
                acceptAction.command = {
                    command: 'nous.acceptCorrection',
                    title: 'Accept Correction',
                    arguments: [error.range, error.correction, error.decorationType],
                };
                actions.push(acceptAction);

                const rejectAction = new vscode.CodeAction(`Reject Suggestion`, vscode.CodeActionKind.QuickFix);
                rejectAction.command = {
                    command: 'nous.rejectCorrection',
                    title: 'Reject Suggestion',
                    arguments: [error.range, error.decorationType],
                };
                actions.push(rejectAction);
            }

            return actions;
        }
    }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] });

    context.subscriptions.push(codeActionProvider);

    // Command to accept correction
    const acceptCorrectionCommand = vscode.commands.registerCommand('nous.acceptCorrection', async (range: vscode.Range, correction: string, decorationType: vscode.TextEditorDecorationType) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const originalText = editor.document.getText(range);
            const originalLength = originalText.length;
            const newLength = correction.length;
            const lengthDifference = newLength - originalLength;
    
            await editor.edit(editBuilder => {
                // Replace the entire range of the error with the correction
                editBuilder.replace(range, correction);
            });
    
            // Remove the corrected error from errorRanges
            const errorIndex = errorRanges.findIndex(e => e.range.isEqual(range));
            if (errorIndex !== -1) {
                errorRanges.splice(errorIndex, 1);
            }
    
            // Adjusts ranges for when correction accepted, otherwise the error ranges for later corrections will be off.
            errorRanges.forEach(err => {
                if (err.range.start.isAfter(range.end)) {
                    // Adjust ranges that are after the edited range
                    err.range = new vscode.Range(
                        editor.document.positionAt(editor.document.offsetAt(err.range.start) + lengthDifference),
                        editor.document.positionAt(editor.document.offsetAt(err.range.end) + lengthDifference)
                    );
                }
            });
    
            // Remove the decoration for the corrected error
            editor.setDecorations(decorationType, errorRanges.map(e => ({ range: e.range })));
    
            // vscode.window.showInformationMessage(`Correction applied: ${correction}`);
        }
    });
    
    

    // Command to reject correction
    const rejectCorrectionCommand = vscode.commands.registerCommand('nous.rejectCorrection', (range: vscode.Range, decorationType: vscode.TextEditorDecorationType) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Remove the rejected error from errorRanges
            const errorIndex = errorRanges.findIndex(e => e.range.isEqual(range));
            if (errorIndex !== -1) {
                errorRanges.splice(errorIndex, 1);
            }
    
            // Clear the decoration for the rejected error
            editor.setDecorations(decorationType, errorRanges.map(e => ({ range: e.range })));
    
            vscode.window.showInformationMessage(`Suggestion rejected.`);
        }
    });
    

    context.subscriptions.push(helloWorldCommand, removeNewlinesCommand, anonymizeCommand, compileMarkdownCommand,
                               identifyErrorsCommand, acceptCorrectionCommand, rejectCorrectionCommand);
    
    context.subscriptions.push(
        vscode.commands.registerCommand('nous.setApiKey', () => setApiKeyCommand(context))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('nous.clearApiKey', () => clearApiKeyCommand(context))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('nous.testApiConnection', async () => {
            await testApiConnection(context); // Pass context here
        })
    );
}

export function deactivate() {}