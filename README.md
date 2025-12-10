# Nous <img src='data/anaxagoras.png' align="right" height="138.5" /></a>

Nous is for researchers and writers who are doing their work using plain text files, particularly Markdown. Nous is meant to make your life easier by including compilation settings for [`pandoc`](https://pandoc.org/) and its extensions natively, so you don't have to go through the unfortunate process your self of setting up Makefiles or working on the command line when you are writing and compiling.

{{Some utilities included in Nous might be a little esoteric with a very narrow use case, largely derived from my own specific workflow,}} but I include them anyway. If you are a qualitative social scientist who also does computational work and have made^[the unfortunate decision to commit yourself to working with plain text files nearly exclusively, then this extension is for you.]

## Installation

### macOS and Linux

Ensure that the Visual Studio Code command-line tool is available:
	
1.	Open VS Code.
2.	Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Linux) to open the Command Palette.
3.	Type Shell Command: Install 'code' command in PATH and select it.
4.	VS Code will add the code command to your shell’s PATH.

After this step, the code command should be available in your terminal.

5.	Restart your terminal to apply the changes.

Then run the following code wherever you downloaded the `.vsix` file:

```sh
code --install-extension nous-0.1.0.vsix
```

### Windows

For Windows it is probably best to install Nous from within VS Code with by downloading the binaries and then, using the command palette (`Cntrl+Shift+P`), running the command "Developer: Install Extension from Location…" and find the downloaded `.vsix`.

## Enhanced Markdown Syntax

Nous comes with some tweaks to how VS Code highlights markdown syntax. The standard behavior of comments in Markdown documents in VS Code is to only allow comments around complete lines of the document using `<!--  -->`. These can also be used inline, but are annoying to type. Nous includes inline comments that will leave text in the source but exclude it from compiled versions of the document. Inline comment are created with double curly brackets `{{...}}`.

For the highlighting to be visible you should add and tweak to your liking the following settings into the VS Code `settings.json` file:

```JSON
"editor.tokenColorCustomizations": {
  "textMateRules": [
    {
      "scope": "punctuation.definition.math.begin.markdown",
      "settings": {
        "foreground": "#1000c0",
        "fontStyle": "bold"
      }
    },
    {
      "scope": "punctuation.definition.math.end.markdown",
      "settings": {
        "foreground": "#1000c0",
        "fontStyle": "bold"
      }
    },
    {
      "scope": "markup.math.inline.markdown",
      "settings": {
        "foreground": "#c27ec4",
        "fontStyle": "italic"
      }
    },
    {
      "scope": "meta.embedded.math.markdown",
      "settings": {
        "foreground": "#e2fb98",
        "fontStyle": "italic"
      }
    },
    {
      "scope": "comment.block.curlybrackets",
      "settings": {
        "foreground": "#ADD8E6",
        "fontStyle": "italic"
      }
    },
    {
      "scope": "markup.footnote.inline.markdown",
      "settings": {
        "foreground": "#d7a0e8",
        "fontStyle": "italic"
      }
    }
  ]
}
```

## Markdown Compilation

Nous also comes with a compilation tool chain for Markdown documents that will help you speed up compiling documents. PDF, DOCX and HTML output are supported. `Cmd+Shift+P >` “Compile Markdown”

The markdown compiler uses [pandoc](https://pandoc.org/) and can take in options defined in the YAML header of the document but uses a unique YAML structure that looks like this:

```YAML
---
title: "My Research Paper"
author: "Your Name"
date: 2024-12-03
bibliography: references.bib
csl: apa.csl

# Pandoc compilation options
pandoc:
  pdf:
    engine: xelatex
    filters:
      - pandoc-xnos
      - citeproc
    options:
      - "--toc"
      - "--number-sections"
  docx:
    reference-doc: custom-template.docx
    filters:
      - pandoc-citeproc
  html:
    standalone: true
    self-contained: true
---
```

## Citation Auto-Completion

I liked the [PandocCiter](https://github.com/notZaki/PandocCiter) extension so much that I ported over that functionality to Nous. The nousCiter functionality will allow auto-completing citations from a bib file defined in the YAML header or from the VS Code settings when you type the `@` symbol.

## Grammar and Spell Checking

**In Development. Not Very Helpful Yet.**

The grammar and spell checking feature of Nous uses LLMs to find grammatical and spelling errors and offer suggestions. Nous supports making calls to two different endpoints: [OpenAI's API](https://platform.openai.com/docs/overview) or to a local installation of one of [Meta's Llama](https://www.llama.com/) models (3.2 to be specific). If using OpenAI, you'll need an API key for OpenAI's which can be securely entered into Nous's options through the command palette with the command `Cmd+Shift+P >` "Set API key". **Please note:** Your API key is securely stored locally using VS Code's secret storage function.

If using a local installation of Llama 3.2, you'll have to have the model installed. I suggest using [Ollama](https://ollama.com/) as it is very easy and makes the process painless. 

The grammar and spell checker is currently designed only for use with Markdown files but will be developed to include plain text documents including $\LaTeX$, RMarkdown, etc. It currently has a 500 token limit that it is able to process at any given time, but the API can be called multiple times to achieve complete document coverage. Errors are meant to be highlighted as being either "grammatical" (green) or "spelling" (red). Quick fix actions (`Cmd + .`) are available to accept or reject suggested edits.

**It is very buggy and has limited functionality right now but it is starting to work.**

## Plaintext Utilities

There are certain commands that make working with plaintext files a little easier. 

### Remove Newlines (`\n`)

This command removes new line metacharacters from selected text. Helpful when you have text that has been arbitrarily cut off into lots of short lines, such as when you copy from a PDF. `Cmd+Shift+P >` "Remove Newlines in Selection"

### Anonymize Text

This replaces highlighted characters with underscores, for moments when you are working with text that includes information you'd like to anonymize such as "Dr. John Smith" can become "Dr. ____ _____". `Cmd+Shift+P >` "Replace Text with Underscores".

## Acknowledgments

Nous incorporates citation autocomplete functionality from [PandocCiter](https://github.com/notZaki/PandocCiter) by notZaki, licensed under the MIT License.