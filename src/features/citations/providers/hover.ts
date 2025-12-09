/**
 * Citation autocomplete functionality
 * 
 * Adapted from PandocCiter by notZaki
 * https://github.com/notZaki/PandocCiter
 * Copyright (c) 2018 notZaki
 * Licensed under the MIT License
 * 
 * Modified for integration with Nous extension
 */

import * as vscode from "vscode";
import { Citer } from "../../../extension";

/**
 * Provides hover information for citation keys
 * 
 * When hovering over a citation key (e.g., @smith2020), displays
 * the full bibliographic information from the .bib file.
 */
export class HoverProvider implements vscode.HoverProvider {
  extension: Citer;

  /**
   * Creates a new HoverProvider
   * @param extension - Reference to the main Citer extension
   */
  constructor(extension: Citer) {
    this.extension = extension;
  }

  /**
   * Provides hover information for citation keys
   * 
   * Detects citation keys (e.g., @smith2020) and shows their
   * bibliographic details when the user hovers over them.
   * 
   * @param document - The document containing the citation
   * @param position - The position where the hover was triggered
   * @param token - Cancellation token
   * @returns Hover object with citation details, or undefined if not a citation
   */
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    // A cite key is an @ symbol followed by word characters (letters or numbers)
    const keyRange = document.getWordRangeAtPosition(
      position,
      /(?<=@)[\w\p{L}\p{M}]+/u
    );
    
    if (keyRange) {
      const citeKey = document.getText(keyRange);
      const cite = this.extension.completer.citation.getEntry(citeKey);
      
      if (cite) {
        // FIX: Check if documentation or detail exists before using
        let hoverMarkdownText = cite.documentation || cite.detail;
        
        // FIX: Only proceed if we have text to display
        if (hoverMarkdownText) {
          // Need double space then a newline to actually get a newline in markdown
          hoverMarkdownText = hoverMarkdownText.replace(/\n/g, "  \n");
          return new vscode.Hover(hoverMarkdownText);
        }
      }
    }
    
    // Return undefined if no citation found or no documentation available
    return undefined;
  }
}
