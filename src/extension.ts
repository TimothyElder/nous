import * as vscode from 'vscode';
import { testApiConnection, identifySpellingGrammarErrors, setBackendCommand} from './utils/apiHandler';
import { setApiKeyCommand, clearApiKeyCommand } from './utils/keyHandler';
import { removeNewlinesCommand, anonymizeCommand } from './utils/plaintextHelpers';
import { compileMarkdownCommand } from './compilation_tools/compileMarkdown';

// Store error ranges globally for access across commands
const errorRanges: { range: vscode.Range; correction: string; decorationType: vscode.TextEditorDecorationType }[] = [];

export function activate(context: vscode.ExtensionContext) {
    console.log('Nous extension is now active!');

    context.subscriptions.push(
        vscode.commands.registerCommand('nous.setBackend', setBackendCommand)
    );

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
    
            // Get the start offset of the selection in the entire document
            const selectionStartOffset = editor.document.offsetAt(selection.start);
    
            for (const error of errors) {
                const errorText = error.error; // Text with the error
                const errorCorrection = error.correction; // Suggested correction
    
                // Find the position of the error text in the selected text
                const startOffsetInSelection = selectedText.indexOf(errorText);
                if (startOffsetInSelection === -1) {
                    console.warn(`Error text not found in selection: ${errorText}`);
                    continue; // Skip if the error text cannot be found
                }
    
                // Adjust offsets to align with the full document
                const startOffsetInDocument = selectionStartOffset + startOffsetInSelection;
                const endOffsetInDocument = startOffsetInDocument + errorText.length;
    
                // Calculate the range for the error in the document
                const start = editor.document.positionAt(startOffsetInDocument);
                const end = editor.document.positionAt(endOffsetInDocument);
                const range = new vscode.Range(start, end);
    
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
    
            vscode.window.showInformationMessage(`Correction applied: ${correction}`);
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

    // CITATION MANAGER STUFF
    const extension = new Citer();

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(() => {
        extension.log("Reacting to document open");
        if (vscode.window.activeTextEditor) {
            extension.manager.findBib();
        }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
          extension.log("Reacting to active document change");
          if (
            vscode.window.activeTextEditor &&
            ["markdown", "rmd", "pweave_md"].includes(
              vscode.window.activeTextEditor.document.languageId
            )
          ) {
            extension.manager.findBib();
          }
        })
      );
    
      context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
          extension.log("Reacting to document save");
          if (vscode.window.activeTextEditor) {
            extension.manager.findBib();
          }
        })
      );
    
      const selector = ["markdown", "rmd", "pweave_md", "quarto"].map(
        (language) => {
          return { scheme: "file", language: language };
        }
      );
    
      extension.manager.findBib();
      context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
          selector,
          extension.completer,
          "@"
        )
      );
      context.subscriptions.push(
        vscode.languages.registerHoverProvider(selector, extension.hover)
      );
      context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(selector, extension.definition)
      );
    
    context.subscriptions.push(
        removeNewlinesCommand, 
        anonymizeCommand, 
        compileMarkdownCommand,
        identifyErrorsCommand, 
        acceptCorrectionCommand, 
        rejectCorrectionCommand
    );
    
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

export class Citer {
    manager: Manager;
    completer: Completer;
    hover: HoverProvider;
    definition: DefinitionProvider;
    logPanel: vscode.OutputChannel;
  
    constructor() {
      this.manager = new Manager(this);
      this.completer = new Completer(this);
      this.hover = new HoverProvider(this);
      this.definition = new DefinitionProvider(this);
      this.logPanel = vscode.window.createOutputChannel("nousCiter");
      this.log(`nousCiter is now activated`);
    }
  
    log(msg: string) {
      // Log to both console and output panel for easier debugging
      console.log(`[nousCiter] ${msg}`);
      const showLog = vscode.workspace.getConfiguration("nous").get("ShowLog", true);
      if (showLog) {
        this.logPanel.append(`${msg}\n`);
      }
    }
  }

export function deactivate() {}