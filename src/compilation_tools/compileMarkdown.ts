import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { parseYamlFrontmatter } from './yamlHandler';
import { preprocessMarkdown, removeCurlyBracketComments } from '../utils/preprocessor';


// Type definitions
interface PandocConfig {
    engine?: string;
    filters?: string[];
    options?: string[];
    'reference-doc'?: string;
    standalone?: boolean;
    'self-contained'?: boolean;
    toc?: boolean;
    'number-sections'?: boolean;
}

// Default configurations for each format
const DEFAULT_CONFIGS: Record<string, PandocConfig> = {
    pdf: {
        engine: 'xelatex',
        filters: ['pandoc-xnos'],
        options: [
            '-r', 'markdown+simple_tables+table_captions+yaml_metadata_block+smart',
            '-s'
        ]
    },
    docx: {
        filters: [],
        options: [
            '-r', 'markdown+simple_tables+table_captions+yaml_metadata_block+smart',
            '-s'
        ]
    },
    html: {
        standalone: true,
        filters: [],
        options: [
            '-r', 'markdown+simple_tables+table_captions+yaml_metadata_block+smart'
        ]
    }
};

// Check if pandoc is installed
function checkPandocInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        child_process.exec('pandoc --version', (error) => {
            resolve(!error);
        });
    });
}

// Resolve file paths relative to source document
function resolveFilePath(relativePath: string, sourceDocumentPath: string): string {
    if (path.isAbsolute(relativePath)) {
        return relativePath;
    }
    
    const sourceDir = path.dirname(sourceDocumentPath);
    return path.resolve(sourceDir, relativePath);
}

// Merge user YAML config with defaults
function buildPandocConfig(
    format: string, 
    yamlData: any,
    sourceDocumentPath: string
): PandocConfig {
    const defaults = DEFAULT_CONFIGS[format] || {};
    const userConfig = yamlData?.pandoc?.[format] || {};
    
    // Merge configurations
    const config: PandocConfig = {
        ...defaults,
        ...userConfig,
        // Merge arrays instead of replacing
        filters: [
            ...(defaults.filters || []),
            ...(userConfig.filters || [])
        ],
        options: [
            ...(defaults.options || []),
            ...(userConfig.options || [])
        ]
    };
    
    // Resolve reference-doc path if present
    if (config['reference-doc']) {
        config['reference-doc'] = resolveFilePath(
            config['reference-doc'],
            sourceDocumentPath
        );
    }
    
    return config;
}

// Build pandoc command from configuration
function buildPandocCommand(
    inputPath: string,
    outputPath: string,
    format: string,
    config: PandocConfig
): string {
    const parts: string[] = ['pandoc'];
    
    // Add reader options
    if (config.options) {
        parts.push(...config.options);
    }
    
    // Add PDF engine
    if (format === 'pdf' && config.engine) {
        parts.push(`--pdf-engine=${config.engine}`);
    }
    
    // Add reference doc for DOCX
    if (format === 'docx' && config['reference-doc']) {
        // Quote the path in case it has spaces
        parts.push(`--reference-doc="${config['reference-doc']}"`);
    }
    
    // Add filters (including citeproc which is always on)
    const allFilters = [...(config.filters || [])];
    allFilters.forEach(filter => {
        parts.push(`--filter`, `${filter}`);
    });
    
    // Add citeproc flag (newer pandoc versions prefer this)
    parts.push('--citeproc');
    
    // HTML-specific options
    if (format === 'html') {
        if (config.standalone) {
            parts.push('-s');
        }
        if (config['self-contained']) {
            parts.push('--self-contained');
        }
    }
    
    // Common options
    if (config.toc) {
        parts.push('--toc');
    }
    if (config['number-sections']) {
        parts.push('--number-sections');
    }
    
    // Input and output (quote paths)
    parts.push(`"${inputPath}"`);
    parts.push('-o');
    parts.push(`"${outputPath}"`);
    
    return parts.join(' ');
}

// Main compilation command
export const compileMarkdownCommand = vscode.commands.registerCommand(
    'nous.compileMarkdown',
    async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found. Please open a Markdown file.');
            return;
        }

        const document = editor.document;

        // Check if it's a markdown file
        if (document.languageId !== 'markdown') {
            vscode.window.showErrorMessage('The current file is not a Markdown file.');
            return;
        }

        // Check if document is saved (we need a path for relative resolution)
        if (document.isUntitled) {
            vscode.window.showErrorMessage('Please save the document before compiling.');
            return;
        }

        // Check if pandoc is installed
        const pandocInstalled = await checkPandocInstalled();
        if (!pandocInstalled) {
            vscode.window.showErrorMessage(
                'Pandoc is not installed or not in PATH. Please install pandoc to use the compiler.'
            );
            return;
        }

        // Parse YAML frontmatter
        const yamlData = parseYamlFrontmatter(document.getText());

        // Prompt for output format
        const formats = ['PDF', 'DOCX', 'HTML'];
        const selectedFormat = await vscode.window.showQuickPick(formats, {
            placeHolder: 'Select the output format',
        });

        if (!selectedFormat) {
            vscode.window.showInformationMessage('Compilation canceled.');
            return;
        }

        const format = selectedFormat.toLowerCase();

        // Prompt for save location
        const defaultFilename = path.basename(
            document.fileName,
            path.extname(document.fileName)
        );
        
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(
                path.join(path.dirname(document.fileName), `${defaultFilename}.${format}`)
            ),
            filters: {
                [selectedFormat]: [format],
            },
        });

        if (!saveUri) {
            vscode.window.showInformationMessage('Compilation canceled.');
            return;
        }

        // Build configuration
        const config = buildPandocConfig(format, yamlData, document.fileName);

        // Preprocess content
        const originalContent = document.getText();
        const preprocessedContent = removeCurlyBracketComments(
            preprocessMarkdown(originalContent)
        );
        
        const tempFilePath = path.join(os.tmpdir(), 'preprocessed.md');
        fs.writeFileSync(tempFilePath, preprocessedContent);

        // Build and execute command
        const command = buildPandocCommand(
            tempFilePath,
            saveUri.fsPath,
            format,
            config
        );
        
        console.log('Executing pandoc command:', command);
        
        vscode.window.showInformationMessage(`Compiling to ${selectedFormat}...`);
        
        child_process.exec(command, (error, stdout, stderr) => {
            // Clean up temp file
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                console.error('Failed to delete temp file:', e);
            }
            
            if (error) {
                vscode.window.showErrorMessage(
                    `Compilation failed: ${stderr || error.message}`
                );
                console.error('Pandoc error:', stderr);
                console.error('Full error:', error);
                return;
            }
            
            vscode.window.showInformationMessage(
                `Successfully compiled to ${saveUri.fsPath}`
            );
            
            // Optionally open the file
            if (format === 'html') {
                vscode.env.openExternal(saveUri);
            }
        });
    }
);