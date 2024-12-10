import * as os from 'os';

export function preprocessMarkdown(content: string): string {
    const homePath = os.homedir();
    return content.replace(/\$HOME/g, homePath);
}

export function removeCurlyBracketComments(content: string): string {
    return content.replace(/\{\{.*?\}\}/g, '');
}
