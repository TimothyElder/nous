// Import the VS Code extensibility API
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { testApiConnection } from './utils/apiHandler';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Output a diagnostic message once when your extension is activated
    console.log('Congratulations, your extension "nous" is now active!');

    // Register the "helloWorld" command
    const helloWorldCommand = vscode.commands.registerCommand('nous.helloWorld', () => {
        vscode.window.showInformationMessage('I\'m Nous! Here to help you.');
    });

    // Register the "removeNewlines" command
    const removeNewlinesCommand = vscode.commands.registerCommand('nous.removeNewlines', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const selectedText = document.getText(selection);

            // Remove new line characters in the selected text
            const processedText = selectedText.replace(/\n/g, ' ');

            editor.edit(editBuilder => {
                editBuilder.replace(selection, processedText);
            });
        }
    });

    // Register the "Anonymize" command
    const anonymizeCommand = vscode.commands.registerCommand('nous.Anonymize', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const selectedText = document.getText(selection);

            // Replace each character in selectedText with an underscore
            const processedText = selectedText.replace(/./g, '_');

            editor.edit(editBuilder => {
                editBuilder.replace(selection, processedText);
            });
        }
    });
    
    const compileMarkdownCommand = vscode.commands.registerCommand('nous.compileMarkdown', async () => {
        // Prompt user for the output format
        const format = await vscode.window.showQuickPick(['PDF', 'HTML', 'DOCX'], {
            placeHolder: 'Choose the output format',
        });

        if (!format) {
            vscode.window.showErrorMessage('No format selected. Compilation canceled.');
            return;
        }

        // Prompt user for a template if they want one
        const useTemplate = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Do you want to use a custom template?',
        });

        let templateOption = '';
        if (useTemplate === 'Yes') {
            // Prompt user to select the template file (assuming templates are in a specific directory)
            const templateDirectory = '/Users/timothyelder/.pandoc/templates';  // Update this to your templates folder
            const templateFiles = format === 'DOCX' 
                ? ['journal-submission.docx', 'project-proposal.docx']  // DOCX templates
                : ['dartmouth-letter.template',  'ucetd.template',
                                   'doc-title.template', 'latex.template', 'prose.template', 'xelatex-modsyl.template',
                                   'eisvogel.latex', 'letter.template', 'socarxiv.template', 'xelatex.template',
                                   'html.template', 'memo.template', 'twocol.template'];    // PDF/HTML templates
            const selectedTemplate = await vscode.window.showQuickPick(templateFiles, {
                placeHolder: 'Choose a template for this format',
            });

            if (selectedTemplate) {
                const templatePath = path.join(templateDirectory, selectedTemplate);

                // Choose the correct option based on format
                if (format === 'PDF' || format === 'HTML') {
                    templateOption = `--template="${templatePath}"`;
                } else if (format === 'DOCX') {
                    templateOption = `--reference-doc="${templatePath}"`;
                }
            } else {
                vscode.window.showWarningMessage('No template selected. Continuing without a template.');
            }
        }

        // Get the currently open file in the editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found. Open a Markdown file to compile.');
            return;
        }
        
        const documentPath = editor.document.fileName;

        // Determine the output file path
        const outputFilePath = documentPath.replace(/\.md$/, `.${format.toLowerCase()}`);

        // Base Pandoc command
        let command = [
            'pandoc',
            `"${documentPath}"`,
            `-o "${outputFilePath}"`,
            templateOption // Adds either --template= or --reference-doc=, if set
        ];

        // Conditionally add the PDF engine option if format is PDF
        if (format === 'PDF') {
            command.push('--pdf-engine=xelatex');
        }

        // Join command components into a single command string
        const commandString = command.join(' ');

        // Execute the command
        child_process.exec(commandString, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Error compiling document: ${stderr}`);
                return;
            }
            vscode.window.showInformationMessage(`Document compiled to ${outputFilePath}`);
        });
    });
    const testApiCommand = vscode.commands.registerCommand('nous.testApiConnection', async () => {
        vscode.window.showInformationMessage('Testing API connection...');
        await testApiConnection();
    });

    

    // Add each command to the context's subscriptions to ensure proper cleanup
    context.subscriptions.push(helloWorldCommand);
    context.subscriptions.push(removeNewlinesCommand);
    context.subscriptions.push(anonymizeCommand);
    context.subscriptions.push(compileMarkdownCommand);
    context.subscriptions.push(testApiCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}