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

    // Command to identify spelling and grammar errors
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
        const errors = await identifySpellingGrammarErrors(selectedText);
    
        if (errors && Array.isArray(errors)) {
            // Clear previous decorations
            const spellingErrorDecoration = vscode.window.createTextEditorDecorationType({ textDecoration: 'underline wavy red' });
            const grammarErrorDecoration = vscode.window.createTextEditorDecorationType({ textDecoration: 'underline wavy green' });
    
            const spellingDecorations: vscode.DecorationOptions[] = [];
            const grammarDecorations: vscode.DecorationOptions[] = [];
            errorRanges.length = 0; // Reset stored errors
    
            for (const error of errors) {
                
                const start = editor.document.positionAt(selection.start.character + error.start_position);
                console.log('Start Position Object:', start);
                
                const end = editor.document.positionAt(selection.start.character + error.end_position);
                console.log('End Position Object:', end);
                
                const range = new vscode.Range(start, end);
                console.log('Range of Position Object:', range);
    
                // Extract error text and correction
                const errorText = error.error;          // Text with the error
                console.log('Error text:', errorText);
                
                const errorCorrection = error.correction; // Suggested correction
                console.log('Error correction:', errorCorrection);

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
            await editor.edit(editBuilder => {
                // Replace the entire range of the error with the correction
                editBuilder.replace(range, correction);
            });
            // Remove the decoration by updating to only show remaining errors
            editor.setDecorations(decorationType, errorRanges.filter(e => !e.range.isEqual(range)).map(e => ({ range: e.range })));
            vscode.window.showInformationMessage(`Correction applied: ${correction}`);
        }
    });

    // Command to reject correction
    const rejectCorrectionCommand = vscode.commands.registerCommand('nous.rejectCorrection', (range: vscode.Range, decorationType: vscode.TextEditorDecorationType) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Update decorations by removing the rejected suggestion
            editor.setDecorations(decorationType, errorRanges.filter(e => !e.range.isEqual(range)).map(e => ({ range: e.range })));
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