import * as vscode from 'vscode';
import * as child_process from 'child_process';

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
        const processedText = selectedText.replace(/./g, '_');
        editor.edit(editBuilder => editBuilder.replace(selection, processedText));
    }
});

// Markdown compiler
export const compileMarkdownCommand = vscode.commands.registerCommand('nous.compileMarkdown', async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor found. Please open a Markdown file to compile.');
        return;
    }

    const document = editor.document;
    console.log("Document languageID:", document.languageId)
    if (document.languageId !== 'markdown' && document.languageId !== 'md') {
        vscode.window.showErrorMessage('The current file is not a Markdown file.');
        return;
    }

    // Prompt the user to select the output format
    const formats = ['PDF', 'HTML', 'DOCX'];
    const selectedFormat = await vscode.window.showQuickPick(formats, {
        placeHolder: 'Select the format to compile to',
    });

    if (!selectedFormat) {
        vscode.window.showInformationMessage('No format selected. Compilation canceled.');
        return;
    }

    // Construct output file path
    const outputExtension = selectedFormat.toLowerCase().replace(' ', '');
    const saveUri = await vscode.window.showSaveDialog({
        filters: {
            [selectedFormat]: [outputExtension],
        },
    });

    if (!saveUri) {
        vscode.window.showInformationMessage('No file selected. Compilation canceled.');
        return;
    }

    const outputPath = saveUri.fsPath;

    // Run Pandoc command
    const inputPath = document.uri.fsPath;
    const command = `pandoc "${inputPath}" -o "${outputPath}"`;

    vscode.window.showInformationMessage(`Compiling Markdown to ${selectedFormat}...`);
    child_process.exec(command, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`Error during compilation: ${stderr}`);
            return;
        }
        vscode.window.showInformationMessage(`Markdown compiled successfully to ${outputPath}`);
    });
})