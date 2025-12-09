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

// The MIT License (MIT)
//
// Copyright (c) 2021 Anran Yang
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { dirname, join } from "path";
import * as vscode from "vscode";
import { Citer } from "../../../../extension";

const foreSearchChars = 800;
const tblPrintLines = 3;

/**
 * Context information for parsing cross-references
 */
interface ParseContext {
  lineMatch: RegExpExecArray;
  type: string;
  label: string;
  doc: vscode.TextDocument;
}

/**
 * Provides cross-reference completion for figures, tables, equations, sections, and listings
 * 
 * Parses markdown documents to find labeled elements (e.g., {#fig:example})
 * and provides autocomplete suggestions for cross-referencing them.
 */
export class Crossref {
  extension: Citer;
  lineRegex: RegExp;
  regexes: {
    fig: RegExp;
    eq: RegExp;
    sec: RegExp;
    tbl: RegExp;
    lst: RegExp;
  };

  /**
   * Creates a new Crossref provider
   * @param extension - Reference to the main Citer extension
   */
  constructor(extension: Citer) {
    this.extension = extension;
    this.lineRegex = /.*\{.*#(fig|tbl|eq|sec|lst):(\w+).*\}.*/g;
    this.regexes = {
      fig: /!\[(.*)\]\((.+)\)\{/,
      eq: /\$\$\s*\{/,
      sec: /#*\s*(.*)\s*\{/,
      tbl: /:\s*(.*)\s*\{/,
      lst: /```.*\{/,
    };
  }

  /**
   * Parses a figure reference
   * @param ctx - Parse context with match information
   * @returns Completion item for the figure, or null if parsing fails
   * @private
   */
  private parseFig(ctx: ParseContext): vscode.CompletionItem | null {
    let match = this.regexes.fig.exec(ctx.lineMatch.toString());
    if (!match) return null;
    const title = match[1];
    const documentation = new vscode.MarkdownString(
      `![](${join(dirname(ctx.doc.fileName), match[2])}|"width=300")`
    );
    return {
      label: `${ctx.type}:${ctx.label}`,
      detail: title,
      documentation,
      kind: vscode.CompletionItemKind.Reference,
    };
  }

  /**
   * Parses a section reference
   * @param ctx - Parse context with match information
   * @returns Completion item for the section, or null if parsing fails
   * @private
   */
  private parseSec(ctx: ParseContext): vscode.CompletionItem | null {
    let match = this.regexes.sec.exec(ctx.lineMatch.toString());
    if (!match) return null;
    const title = match[1];
    return {
      label: `${ctx.type}:${ctx.label}`,
      detail: title,
      kind: vscode.CompletionItemKind.Reference,
    };
  }

  /**
   * Parses a table reference
   * @param ctx - Parse context with match information
   * @returns Completion item for the table, or null if parsing fails
   * @private
   */
  private parseTbl(ctx: ParseContext): vscode.CompletionItem | null {
    let match = this.regexes.tbl.exec(ctx.lineMatch.toString());
    if (!match) return null;
    const title = match[1];
    let documentation = new vscode.MarkdownString("");
    const doc = ctx.doc.getText();
    const searchStart = Math.max(ctx.lineMatch.index - foreSearchChars, 0);
    const sig = doc
      .substring(searchStart, ctx.lineMatch.index)
      .lastIndexOf("|:-");
    if (sig > 0) {
      const begin = doc.lastIndexOf("\n\n", sig + searchStart);
      let cursor = begin;
      // +2 = with header & splitter
      for (let i = 0; i < tblPrintLines + 2; i++) {
        const pos = doc.indexOf("\n", cursor + 1);
        if (pos < 0) break;
        else cursor = pos;
      }
      documentation = new vscode.MarkdownString(
        doc.substring(begin + 2, cursor)
      );
    }
    return {
      label: `${ctx.type}:${ctx.label}`,
      detail: title,
      documentation,
      kind: vscode.CompletionItemKind.Reference,
    };
  }

  /**
   * Parses a listing (code block) with normal match
   * @param ctx - Parse context with match information
   * @param _ - Regex match (unused)
   * @returns Completion item for the listing
   * @private
   */
  private parseLstNormalMatch(
    ctx: ParseContext,
    _: RegExpExecArray
  ): vscode.CompletionItem {
    const doc = ctx.doc.getText();
    const end = doc.indexOf("```", ctx.lineMatch.index + 1);

    // try to parse language
    const langMatch = /\{.*\.(\w+).*\}/.exec(ctx.lineMatch.toString());
    const lang = langMatch ? langMatch[1] : "";

    // try to parse caption
    const titleMatch = /\{.*caption="(.+)".*\}/.exec(ctx.lineMatch.toString());
    let title = titleMatch ? titleMatch[1] : ctx.label;
    let documentation = new vscode.MarkdownString("");

    if (end > 0) {
      documentation = new vscode.MarkdownString(
        "``` " +
          lang +
          " " +
          doc.substring(ctx.lineMatch.index + ctx.lineMatch[0].length, end) +
          "\n```"
      );
    }
    return {
      label: `${ctx.type}:${ctx.label}`,
      documentation,
      detail: title,
      kind: vscode.CompletionItemKind.Reference,
    };
  }

  /**
   * Parses a listing (code block) from a table match
   * @param ctx - Parse context with match information
   * @param match - Regex match containing the table data
   * @returns Completion item for the listing
   * @private
   */
  private parseLstTableMatch(
    ctx: ParseContext,
    match: RegExpExecArray
  ): vscode.CompletionItem {
    const doc = ctx.doc.getText();
    const searchStart = Math.max(ctx.lineMatch.index - foreSearchChars, 0);

    let documentation = new vscode.MarkdownString("");
    const title = match[1];

    const sig = doc
      .substring(searchStart, ctx.lineMatch.index)
      .lastIndexOf("```");
    if (sig > 0) {
      const begin = doc.lastIndexOf("\n\n", sig + searchStart);
      let cursor = begin;
      // +2 = with header & splitter
      for (let i = 0; i < tblPrintLines + 2; i++) {
        const pos = doc.indexOf("\n", cursor + 1);
        if (pos < 0) break;
        else cursor = pos;
      }
      documentation = new vscode.MarkdownString(
        doc.substring(begin + 2, cursor)
      );
    }

    return {
      label: `${ctx.type}:${ctx.label}`,
      documentation: documentation,
      detail: title,
      kind: vscode.CompletionItemKind.Reference,
    };
  }

  /**
   * Parses a listing (code block) reference
   * @param ctx - Parse context with match information
   * @returns Completion item for the listing, or null if parsing fails
   * @private
   */
  private parseLst(ctx: ParseContext): vscode.CompletionItem | null {
    const normalMatch = this.regexes.lst.exec(ctx.lineMatch.toString());
    if (normalMatch) {
      return this.parseLstNormalMatch(ctx, normalMatch);
    }
    const tableMatch = this.regexes.tbl.exec(ctx.lineMatch.toString());
    if (tableMatch) {
      return this.parseLstTableMatch(ctx, tableMatch);
    }
    return null;
  }

  /**
   * Parses an equation reference
   * @param ctx - Parse context with match information
   * @returns Completion item for the equation, or null if parsing fails
   * @private
   */
  private parseEq(ctx: ParseContext): vscode.CompletionItem | null {
    let match = this.regexes.eq.exec(ctx.lineMatch.toString());
    if (!match) return null;
    const doc = ctx.doc.getText();
    const matchIndex = ctx.lineMatch.index + match.index;
    const searchStart = Math.max(matchIndex - foreSearchChars, 0);
    const begin =
      doc.substring(searchStart, matchIndex).lastIndexOf("$$") + searchStart;

    if (begin < 0) {
      return null;
    }
    return {
      label: `${ctx.type}:${ctx.label}`,
      detail: ctx.label,
      documentation: new vscode.MarkdownString(
        doc.substring(begin + 2, matchIndex)
      ),
      kind: vscode.CompletionItemKind.Reference,
    };
  }

  /**
   * Provides cross-reference completion items
   * 
   * Scans the document for labeled elements and returns appropriate
   * completion items based on the configured mode (full/minimal/none).
   * 
   * @param args - Optional document context
   * @returns Array of completion items for cross-references
   */
  provide(args?: { document: vscode.TextDocument }): vscode.CompletionItem[] {
    // FIX: Check if args is defined
    if (!args) {
      return [];
    }

    const mode: string = vscode.workspace
      .getConfiguration("nous")
      .get("CrossRefMode", "full");
    if (mode === "none") return [];

    const targets: vscode.CompletionItem[] = [];
    let match: RegExpExecArray | null;
    
    // FIX: Type the parsers object properly to allow string indexing
    const parsers: { [key: string]: (ctx: ParseContext) => vscode.CompletionItem | null } = {
      fig: this.parseFig.bind(this),
      sec: this.parseSec.bind(this),
      tbl: this.parseTbl.bind(this),
      lst: this.parseLst.bind(this),
      eq: this.parseEq.bind(this),
    };
    
    while ((match = this.lineRegex.exec(args.document.getText())) !== null) {
      const type = match[1];
      const label = match[2];
      switch (mode) {
        case "full":
          const parser = parsers[type];
          if (parser) {
            let item = parser({
              lineMatch: match,
              type,
              label,
              doc: args.document,
            });
            // FIX: Only push if item is not null
            if (item) {
              targets.push(item);
            }
          }
          break;
        case "minimal":
          targets.push({
            label: `${match[1]}:${match[2]}`,
            kind: vscode.CompletionItemKind.Reference,
          });
          break;
      }
    }
    return targets;
  }
}
