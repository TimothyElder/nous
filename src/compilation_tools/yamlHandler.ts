import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

// return true if YAML header present
export function hasYamlFrontmatter(text: string): boolean {
    const trimmedText = text.trimStart();
    return trimmedText.startsWith('---');
}

// return YAML as string
export function extractYamlFrontmatter(text: string): string | null {
    const trimmedText = text.trimStart();
    
    if (!trimmedText.startsWith('---')) {
        return null;
    }
    
    const lines = trimmedText.split('\n');
    let endIndex = -1;
    
    // Start from line 1 (skip first ---)
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            endIndex = i;
            break;
        }
    }
    
    if (endIndex === -1) {
        return null;
    }
    
    return lines.slice(1, endIndex).join('\n');
}

// Return YAML content as structured
export function parseYamlFrontmatter(text: string): any | null {
    const yamlText = extractYamlFrontmatter(text);
    
    if (!yamlText) {
        return null;
    }
    
    try {
        return yaml.load(yamlText);
    } catch (e) {
        console.error('Failed to parse YAML frontmatter:', e);
        return null;
    }
}

// Convenience wrapper for VS Code documents
export function parseYamlFromDocument(document: vscode.TextDocument): any | null {
    return parseYamlFrontmatter(document.getText());
}
