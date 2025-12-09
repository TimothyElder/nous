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

// This file is adapted from https://github.com/James-Yu/LaTeX-Workshop/blob/master/src/providers/completer/citation.ts
// Original license below:
////////////////////////////////////////////////////////////////////////////////
// The MIT License (MIT)
//
// Copyright (c) 2016 James Yu
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

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { Citer } from "../../../../extension";
import { bibtexParser } from "latex-utensils";

/**
 * Represents a citation suggestion with all its bibliographic data
 */
export interface Suggestion extends vscode.CompletionItem {
  key: string;
  documentation: string;
  fields: { [key: string]: string };
  file: string;
  position: vscode.Position;
}

/**
 * Manages citation entries from BibTeX and BibJSON files
 * 
 * Provides autocomplete suggestions for citations by parsing
 * bibliography files and maintaining a cache of entries.
 */
export class Citation {
  extension: Citer;
  private bibEntries: { [file: string]: Suggestion[] } = {};

  /**
   * Creates a new Citation manager
   * @param extension - Reference to the main Citer extension
   */
  constructor(extension: Citer) {
    this.extension = extension;
  }

  /**
   * Provides citation completion items for autocomplete
   * 
   * @param args - Optional context information about where completion was requested
   * @returns Array of completion items for VS Code autocomplete
   */
  provide(args?: {
    document: vscode.TextDocument;
    position: vscode.Position;
    token: vscode.CancellationToken;
    context: vscode.CompletionContext;
  }): vscode.CompletionItem[] {
    // Compile the suggestion array to vscode completion array
    return this.updateAll().map((item) => {
      item.filterText = Object.values(item.fields).join(" ");
      item.insertText = item.key;
      if (args) {
        item.range = args.document.getWordRangeAtPosition(
          args.position,
          /[-a-zA-Z0-9_:.]+/
        );
      }
      return item;
    });
  }

  /**
   * Opens a quick pick menu to browse and insert citations
   * 
   * @param _args - Optional context information (currently unused)
   */
  browser(_args?: {
    document: vscode.TextDocument;
    position: vscode.Position;
    token: vscode.CancellationToken;
    context: vscode.CompletionContext;
  }) {
    vscode.window
      .showQuickPick(
        this.updateAll().map((item) => {
          return {
            label: item.fields.title ? item.fields.title : "",
            description: `${item.key}`,
            detail: `Authors: ${
              item.fields.author ? item.fields.author : "Unknown"
            }, publication: ${
              item.fields.journal
                ? item.fields.journal
                : item.fields.journaltitle
                ? item.fields.journaltitle
                : item.fields.publisher
                ? item.fields.publisher
                : "Unknown"
            }`,
          };
        }),
        {
          placeHolder: "Press ENTER to insert citation key at cursor",
          matchOnDetail: true,
          matchOnDescription: true,
          ignoreFocusOut: true,
        }
      )
      .then((selected) => {
        if (!selected) {
          return;
        }
        if (vscode.window.activeTextEditor) {
          const editor = vscode.window.activeTextEditor;
          const content = editor.document.getText(
            new vscode.Range(new vscode.Position(0, 0), editor.selection.start)
          );
          let start = editor.selection.start;
          if (content.lastIndexOf("\\cite") > content.lastIndexOf("}")) {
            const curlyStart = content.lastIndexOf("{") + 1;
            const commaStart = content.lastIndexOf(",") + 1;
            start = editor.document.positionAt(
              curlyStart > commaStart ? curlyStart : commaStart
            );
          }
          editor
            .edit((edit) =>
              edit.replace(
                new vscode.Range(start, editor.selection.start),
                selected.description || ""
              )
            )
            .then(
              () =>
                (editor.selection = new vscode.Selection(
                  editor.selection.end,
                  editor.selection.end
                ))
            );
        }
      });
  }

  /**
   * Parses a bibliography file based on its extension
   * 
   * @param file - Path to the bibliography file (.bib or .json)
   */
  parseBibFile(file: string) {
    const ext = path.extname(file);
    if (ext == ".bib") {
      this.parseBibtexFile(file);
    } else if (ext == ".json") {
      this.parseBibjsonFile(file);
    } else {
      this.extension.log(`Unknown file extension force: ${file}`);
    }
  }

  /**
   * Parses a BibJSON format bibliography file
   * 
   * @param file - Path to the .json file
   */
  parseBibjsonFile(file: string) {
    const fields: string[] = (
      vscode.workspace
        .getConfiguration("nous")
        .get("CitationFormat") as string[]
    ).map((f) => {
      return f.toLowerCase();
    });
    this.extension.log(`Parsing .bib entries from ${file}`);
    this.bibEntries[file] = [];
    let json = JSON.parse(fs.readFileSync(file, "utf-8"));
    
    // FIX: Add type annotation for entry parameter
    json.forEach((entry: any) => {
      const item: Suggestion = {
        key: entry.id,
        label: entry.id,
        file,
        position: new vscode.Position(0, 0),
        kind: vscode.CompletionItemKind.Reference,
        documentation: "",
        fields: {},
      };
      if (entry.author) {
        // FIX: Add type annotation for element parameter
        entry.author.forEach((element: any) => {
          if (item.fields.author) {
            item.fields.author += " and ";
          } else {
            item.fields.author = "";
          }
          item.fields.author += Object.values(element).join(", ");
        });
        item.documentation += `author: ${item.fields.author}\n`;
      } else if (entry.editor) {
        // FIX: Add type annotation for element parameter
        entry.editor.forEach((element: any) => {
          if (item.fields.editor) {
            item.fields.editor += " and ";
          } else {
            item.fields.editor = "";
          }
          item.fields.editor += Object.values(element).join(", ");
        });
        item.documentation += `editor: ${item.fields.editor}\n`;
      }
      if (entry.issued) {
        item.documentation += `date: ${Object.values(entry.issued).join()}\n`;
      }
      if (entry.DOI) {
        item.documentation += `link: https://doi.org/${entry.DOI}\n`;
      } else if (entry.URL) {
        item.documentation += `link: ${entry.URL}\n`;
      }
      fields.forEach((field) => {
        if (entry[field] && !item.fields[field]) {
          item.fields[field] = entry[field];
          item.documentation += `${field}: ${item.fields[field]}\n`;
        }
      });
      this.bibEntries[file].push(item);
    });
    this.extension.log(
      `Parsed ${this.bibEntries[file].length} bib entries from ${file}.`
    );
  }

  /**
   * Parses a BibTeX format bibliography file
   * 
   * @param file - Path to the .bib file
   */
  parseBibtexFile(file: string) {
    const fields: string[] = (
      vscode.workspace
        .getConfiguration("nous")
        .get("CitationFormat") as string[]
    ).map((f) => {
      return f.toLowerCase();
    });
    this.extension.log(`Parsing .bib entries from ${file}`);
    this.bibEntries[file] = [];
    const bibtex = fs.readFileSync(file).toString();
    const ast = bibtexParser.parse(bibtex);
    ast.content
      .filter(bibtexParser.isEntry)
      .forEach((entry: bibtexParser.Entry) => {
        if (entry.internalKey === undefined) {
          return;
        }
        const item: Suggestion = {
          key: entry.internalKey,
          label: entry.internalKey,
          file,
          position: new vscode.Position(
            entry.location.start.line - 1,
            entry.location.start.column - 1
          ),
          kind: vscode.CompletionItemKind.Reference,
          documentation: "",
          fields: {},
        };
        fields.forEach((field) => {
          const fieldcontents = entry.content.filter((e) => e.name === field);
          if (fieldcontents.length > 0) {
            const fieldcontent = fieldcontents[0];
            const value = Array.isArray(fieldcontent.value.content)
              ? fieldcontent.value.content.join(" ")
              : this.deParenthesis(fieldcontent.value.content);
            item.fields[fieldcontent.name] = value;
            item.documentation += `${
              fieldcontent.name.charAt(0).toUpperCase() +
              fieldcontent.name.slice(1)
            }: ${value}\n`;
          }
        });
        this.bibEntries[file].push(item);
      });
    this.extension.log(
      `Parsed ${this.bibEntries[file].length} bib entries from ${file}.`
    );
  }

  /**
   * Retrieves a citation entry by its key
   * 
   * @param key - The citation key to search for
   * @returns The suggestion object if found, undefined otherwise
   */
  getEntry(key: string): Suggestion | undefined {
    const suggestions = this.updateAll();
    const entry = suggestions.find((elm) => elm.key === key);
    return entry;
  }

  /**
   * Removes curly braces from LaTeX field values
   * 
   * @param str - String with potential curly braces
   * @returns String with braces removed
   * @private
   */
  private deParenthesis(str: string) {
    return str.replace(/{+([^\\{}]+)}+/g, "$1");
  }

  /**
   * Collects all citation suggestions from loaded bibliography files
   * 
   * @param bibFiles - Optional array of specific files to include
   * @returns Array of all citation suggestions
   * @private
   */
  private updateAll(bibFiles?: string[]): Suggestion[] {
    let suggestions: Suggestion[] = [];
    // From bib files
    if (bibFiles === undefined) {
      bibFiles = Object.keys(this.bibEntries);
    }
    bibFiles.forEach((file) => {
      suggestions = suggestions.concat(this.bibEntries[file]);
    });
    this.checkForDuplicates(suggestions);
    return suggestions;
  }

  /**
   * Checks for duplicate citation keys and notifies the user
   * 
   * @param items - Array of citation suggestions to check
   */
  checkForDuplicates(items: Suggestion[]) {
    const allKeys = items.map((items) => items.key);
    if (new Set(allKeys).size !== allKeys.length) {
      // Code from: https://stackoverflow.com/questions/840781/get-all-non-unique-values-i-e-duplicate-more-than-one-occurrence-in-an-array
      // FIX: Add type annotations for arrow function parameters
      const count = (keys: string[]) =>
        keys.reduce((a: any, b: string) => Object.assign(a, { [b]: (a[b] || 0) + 1 }), {});
      const duplicates = (dict: any) => Object.keys(dict).filter((a) => dict[a] > 1);
      vscode.window.showInformationMessage(
        `Duplicate key(s): ${duplicates(count(allKeys))}`
      );
    }
  }

  /**
   * Removes parsed bibliography entries for a specific file
   * 
   * Called when a bibliography file is deleted or no longer in use
   * 
   * @param bibPath - Path to the bibliography file to forget
   */
  forgetParsedBibItems(bibPath: string) {
    this.extension.log(`Forgetting parsed bib entries for ${bibPath}`);
    delete this.bibEntries[bibPath];
  }
}