# Nous <img src='data/anaxagoras.png' align="right" height="138.5" /></a>

Nous is for researchers and writers who are doing their work using plain text files. These include Markdown, $\LaTeX$, RMarkdown, sweave and many more. Nous is meant to make your life easier by including compilation settings for pandoc and its extensions natively, so you don't have to go through the unfortunate process your self of setting up Makefiles or working on the command line when you are writing and compiling.

Some utilities included in Nous might be a little esoteric with a very narrow use case, largely derived from my own specific workflow, but I include them anyway. If you are a qualitative social scientist who also does computational work and have made the unfortunate decision to commit yourself to working with plain text files nearly exclusively, then this extension is for you.

Most importantly Nous includes a grammar and spell checker to help make your work more better! Using the OpenAI API for completions from their GPT models it will help to fix spelling and grammatical errors.

## Enhanced Markdown Syntax

Nous comes with some slight customizations to how markdown works. The standard behavior of comments in Markdown documents in VS Code is to only allow comments around complete lines of the document using `<!--  -->`. These can also be used inline, but are annoying to type. Nous includes inline comments that will leave text in the source but exclude it from compiled versions of the document. This can be helpful for qualitative researchers who want to exclude text from or around quotations without deleting it entirely. This can be helpful for editing long quotes or leaving in identifiers that help you tie quotations back to the respondents ID. This inline comment is used with double curly brackets `{{...}}`.

Further, Nous supports using the variable `$HOME`, in Markdown documents, in case you are working across different machines that do not share the same home directory path. It can be used for instance in the "bibliography" section of your YAML header as in `bibliography: $HOME/path/to/bib.tex`.

## Markdown Compilation

Nous also comes with a compilation tool chain for Markdown documents that will help you speed up compilation of documents. PDF, DOCX and HTML output are supported. `Cmd+Shift+P >` “Compile Markdown”

## Grammar Checking with OpenAI Completion Models

**In Development. Not Very Helpful Yet.**

The grammar and spell checking feature of Nous uses OpenAI's completion models for feedback. You'll need an API key to OpenAI's API which can be securely entered into Nous's options through the command palette with the command `Cmd+Shift+P >` "Set API key". **Please note:** Your API key is securely stored locally using VS Code's secret storage function.

The grammar and spell checker is currently designed only for use with Markdown files but will be developed to include plain text documents including $\LaTeX$, RMarkdown, etc. It currently has a 500 token limit that it is able to process at any given time, but the API can be called multiple times to achieve complete document coverage. Errors are meant to be highlighted as being either "grammatical" (green) or "spelling" (red). Quick fix actions (`Cmd + .`) are available to accept or reject suggested edits.

## Plaintext Utilities

There are certain commands that make working with plaintext files a little easier. 

### Remove Newlines (`\n`)

This command removes new line metacharacters from highlighted text in plaintext files. Helpful when you have text that has been arbitrarily cut off into lots of short lines. `Cmd+Shift+P >` "Remove Newlines in Selection"

### Anonymize Text

This replaces highlighted characters with underscores, for moments when you are working with text that includes information you'd like to anonymize such as "Dr. John Smith" can become "Dr. ____ _____". `Cmd+Shift+P >` "Replace Text with Underscores".