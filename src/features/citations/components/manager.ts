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

// This file is adapted from https://github.com/James-Yu/LaTeX-Workshop/blob/master/src/components/manager.ts
// Original license below:
//////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////////////////

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as chokidar from "chokidar";
import yaml = require("js-yaml");

import { Citer } from "../../../extension";

/**
 * Manages bibliography file discovery and watching
 * 
 * This class is responsible for:
 * - Finding .bib files referenced in markdown YAML frontmatter
 * - Setting up file watchers to detect changes to bibliography files
 * - Notifying the citation completer when bibliography files change
 */
export class Manager {
  extension: Citer;
  bibWatcher: chokidar.FSWatcher | undefined; // FIX: Allow undefined initially
  watched: string[];

  /**
   * Creates a new Manager instance
   * @param extension - Reference to the main Citer extension
   */
  constructor(extension: Citer) {
    this.extension = extension;
    this.watched = [];
    this.bibWatcher = undefined; // FIX: Explicitly initialize
  }

  /**
   * Searches for bibliography files in the active document
   * 
   * Looks for bibliography references in:
   * 1. YAML frontmatter (new approach using yaml parser)
   * 2. Old-style bibliography declaration
   * 3. Root file configuration
   * 4. Default bibliography settings
   */
  findBib(): void {
    // FIX: Check if editor exists
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.extension.log("No active text editor found");
      return;
    }

    let foundFiles: string[] = [];
    const activeText = editor.document.getText();

    // Re-use the old reg-ex approach in case the yaml parser fails
    const bibRegex = /^bibliography:\s*\[(.*)\]/m;
    let bibresult = activeText.match(bibRegex);
    if (bibresult && bibresult[1]) { // FIX: Check bibresult[1] exists
      const bibFiles = bibresult[1].split(",").map((item) => item.trim());
      for (let i in bibFiles) {
        let bibFile = this.stripQuotes(bibFiles[i]);
        bibFile = this.resolveBibFile(bibFile, undefined);
        this.extension.log(`Looking for .bib file: ${bibFile}`);
        this.addBibToWatcher(bibFile);
        foundFiles.push(bibFile);
      }
    }

    // This is the newer approach using yaml-js
    const docURI = editor.document.uri;
    const configuration = vscode.workspace.getConfiguration(
      "nous",
      docURI
    );
    const rootFolder = vscode.workspace.getWorkspaceFolder(docURI)?.uri.fsPath;
    const yamltext = activeText.match(/---\r?\n((.+\r?\n)+)---/gm);
    
    // FIX: Better YAML parsing with proper error handling
    if (yamltext && yamltext.length > 0) {
      try {
        // Parse just the first YAML frontmatter block
        const yamlContent = yamltext[0];
        const parsed = yaml.loadAll(yamlContent);
        
        // FIX: Check if parsed array has content and first element exists
        if (parsed && parsed.length > 0 && parsed[0]) {
          const parsedyaml = parsed[0] as any;
          
          if (parsedyaml && parsedyaml.bibliography) {
            const bibInYaml = parsedyaml.bibliography;
            const bibFiles = bibInYaml instanceof Array ? bibInYaml : [bibInYaml];
            for (let i in bibFiles) {
              let bibFile = this.stripQuotes(bibFiles[i]);
              bibFile = this.resolveBibFile(bibFile, rootFolder);
              this.extension.log(`Looking for file: ${bibFile}`);
              this.addBibToWatcher(bibFile);
              foundFiles.push(bibFile);
            }
          }
        } else {
          this.extension.log("YAML frontmatter found but could not be parsed");
        }
      } catch (error) {
        this.extension.log(`Failed to parse YAML: ${error}`);
      }
    }

    // FIX: Handle undefined rootfile
    const rootfile: string | undefined = configuration.get("RootFile");
    if (rootfile && rootfile !== "") {
      let curInput = path.join(rootfile);
      if (!path.isAbsolute(curInput) && rootFolder) {
        curInput = path.join(rootFolder, rootfile);
      }
      
      // FIX: Check if file exists before reading
      if (fs.existsSync(curInput)) {
        try {
          const rootText = fs.readFileSync(curInput, "utf8");
          const parsedArray = yaml.loadAll(rootText);
          
          // FIX: Check array has content before accessing [0]
          if (parsedArray && parsedArray.length > 0 && parsedArray[0]) {
            const parsedRoot = parsedArray[0] as any;
            
            if (parsedRoot && parsedRoot.bibliography) {
              const bibInYaml = parsedRoot.bibliography;
              const bibFiles = bibInYaml instanceof Array ? bibInYaml : [bibInYaml];
              for (let i in bibFiles) {
                let bibFile = path.join(path.dirname(curInput), bibFiles[i]);
                bibFile = this.resolveBibFile(bibFile, rootFolder);
                this.extension.log(`Looking for file: ${bibFile}`);
                this.addBibToWatcher(bibFile);
                foundFiles.push(bibFile);
              }
            }
          }
        } catch (error) {
          this.extension.log(`Failed to read root file: ${error}`);
        }
      }
    }

    // FIX: Check DefaultBib exists and is not empty
    const defaultBib = configuration.get<string>("DefaultBib");
    if (configuration.get("UseDefaultBib") && defaultBib) {
      let bibFile = path.join(defaultBib);
      bibFile = this.resolveBibFile(bibFile, rootFolder);
      this.extension.log(`Looking for file: ${bibFile}`);
      this.addBibToWatcher(bibFile);
      foundFiles.push(bibFile);
    }

    // FIX: Proper type checking for DefaultBibs array
    const defaultBibs = configuration.get<string[]>("DefaultBibs");
    if (configuration.get("UseDefaultBib") && defaultBibs && defaultBibs.length > 0) {
      defaultBibs.forEach((element) => {
        let bibFile = this.resolveBibFile(path.join(element), rootFolder);
        this.extension.log(`Looking for file: ${bibFile}`);
        this.addBibToWatcher(bibFile);
        foundFiles.push(bibFile);
      });
    }

    let watched_but_not_found = this.watched.filter(
      (e) => !foundFiles.includes(e)
    );
    if (configuration.get("ForgetUnusedBib")) {
      if (watched_but_not_found.length > 0) {
        this.forgetUnusedFiles(watched_but_not_found);
      }
    }
    return;
  }

  /**
   * Removes surrounding quotes from a string if present
   * @param inputString - String that may have quotes
   * @returns String with quotes removed
   */
  stripQuotes(inputString: string): string {
    if (
      inputString[0] === inputString[inputString.length - 1] &&
      "\"'".includes(inputString[0])
    ) {
      return inputString.slice(1, -1);
    } else {
      return inputString;
    }
  }

  /**
   * Resolves a bibliography file path to an absolute path
   * 
   * @param bibFile - The bibliography file path (may be relative)
   * @param rootFolder - The workspace root folder (may be undefined)
   * @returns Absolute path to the bibliography file
   */
  resolveBibFile(bibFile: string, rootFolder: string | undefined): string {
    if (path.isAbsolute(bibFile)) {
      return bibFile;
    } else if (rootFolder) {
      return path.resolve(path.join(rootFolder, bibFile));
    } else {
      // FIX: Handle case where editor might not exist
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return path.resolve(bibFile); // Fallback to current working directory
      }
      return path.resolve(
        path.dirname(editor.document.fileName),
        bibFile
      );
    }
  }

  /**
   * Adds a bibliography file to the file watcher
   * 
   * If the file doesn't exist with the given extension, tries adding .json or .bib.
   * Creates the file watcher if it doesn't exist yet.
   * 
   * @param bibPath - Path to the bibliography file
   */
  addBibToWatcher(bibPath: string): void {
    // Try adding extensions if file doesn't exist
    if (!fs.existsSync(bibPath) && fs.existsSync(bibPath + ".json")) {
      bibPath += ".json";
    }
    if (!fs.existsSync(bibPath) && fs.existsSync(bibPath + ".bib")) {
      bibPath += ".bib";
    }
    
    if (fs.existsSync(bibPath)) {
      this.extension.log(`Found file ${bibPath}`);
      
      // FIX: Create watcher if it doesn't exist
      if (this.bibWatcher === undefined) {
        this.extension.log(`Creating file watcher for files.`);
        this.bibWatcher = chokidar.watch(bibPath, { awaitWriteFinish: true });
        
        this.bibWatcher.on("change", (filePath: string) => {
          this.extension.log(
            `Bib file watcher - responding to change in ${filePath}`
          );
          this.extension.completer.citation.parseBibFile(filePath);
        });
        
        this.bibWatcher.on("unlink", (filePath: string) => {
          this.extension.log(`Bib file watcher: ${filePath} deleted.`);
          this.extension.completer.citation.forgetParsedBibItems(filePath);
          if (this.bibWatcher) { // FIX: Check watcher still exists
            this.bibWatcher.unwatch(filePath);
          }
          this.watched.splice(this.watched.indexOf(filePath), 1);
        });
        
        this.watched.push(bibPath);
        this.extension.completer.citation.parseBibFile(bibPath);
      } else if (this.watched.indexOf(bibPath) < 0) {
        this.extension.log(`Adding file ${bibPath} to bib file watcher.`);
        this.bibWatcher.add(bibPath);
        this.watched.push(bibPath);
        this.extension.completer.citation.parseBibFile(bibPath);
      } else {
        this.extension.log(`bib file ${bibPath} is already being watched.`);
      }
    } else {
      this.extension.log(`Bibliography file not found: ${bibPath}`);
    }
  }

  /**
   * Removes files from the watcher that are no longer in use
   * @param filesToForget - Array of file paths to stop watching
   */
  forgetUnusedFiles(filesToForget: string[]): void {
    for (let i in filesToForget) {
      let filePath = filesToForget[i];
      this.extension.log(`Forget unused bib file: ${filePath}`);
      this.extension.completer.citation.forgetParsedBibItems(filePath);
      
      // FIX: Check watcher exists before unwatching
      if (this.bibWatcher) {
        this.bibWatcher.unwatch(filePath);
      }
      this.watched.splice(this.watched.indexOf(filePath), 1);
    }
    return;
  }
}