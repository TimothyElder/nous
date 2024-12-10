# Nous <img src='data/nous.png' align="right" height="138.5" /></a>

Nous is for researchers and writers who are doing their work using plain text files. These include Markdown, $\LaTeX$, RMarkdown, sweave and many more. Nous is meant to make your life easier by including compilation settings for pandoc and its extensions natively, so you don't have to go through the unfortunate process your self of setting up Makefiles or working on the command line when you are writing and compiling.

Some utilities included in Nous might be a little esoteric with a very narrow use case, largely derived from my own specific workflow, but I include them anyway. If you are a qualitative social scientist who also does computational work and have made the unfortunate decision to commit yourself to working with plain text files nearly exclusively, then this extension is for you.

Most importantly Nous includes a grammar and spell checker to help make your work more better! Using the OpenAI API for completions from their GPT models it will help to fix spelling and grammatical errors.

## Installation 

### macOS and Linux

Ensure that the Visual Studio Code command-line tool is available:
	
1.	Open VS Code.
2.	Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Linux) to open the Command Palette.
3.	Type Shell Command: Install 'code' command in PATH and select it.
4.	VS Code will add the code command to your shell’s PATH.

After this step, the code command should be available in your terminal.

5.	Restart your terminal to apply the changes.

Then run the following code:
```sh
git clone https://github.com/TimothyElder/nous.git
code --install-extension nous/dist/nous-0.0.1.vsix
```

### Windows

For Windows it is probably best to install Nous from within VS Code with by cloning the repo (`git clone https://github.com/TimothyElder/nous.git`) and then with the command palette (`Cntrl+Shift+P`) running the command "Developer: Install Extension from Location..." and find the `.vsix` file in the `dist` directory of Nous.

## Markdown Syntax

Nous comes with some slight customizations to how markdown works. The standard behavior of comments in Markdown documents in VS Code is to only allow comments around complete lines of the document using `<!--  -->`. These can also be used inline, but are annoying to type. Nous includes inline comments that will leave text in the source but exclude it from compiled versions of the document. This can be helpful for qualitative researchers who want to exclude text from or around quotations without deleting it entirely. This can be helpful for editing long quotes or leaving in identifiers that help you tie quotations back to the respondents ID. This inline comment is used with double curly brackets `{{...}}`.

## Plaintext Utilities

There are certain commands that make working with plaintext files a little easier. 

### removeNewlinesCommand

This command removes new line metacharacters from highlighted text in plaintext files. Helpful when you have text that has been arbitrarily cut off into lots of short lines.

### anonymizeCommand

This replaces highlighted characters with underscores, for moments when you are working with text that includes information you'd like to anonymize such as "Dr. John Smith" can become "Dr. ____ _____".

## Markdown Compilation

Nous also comes with a compilation tool chain for Markdown documents that will help you speed up compilation of documents.

## Grammar Checking with OpenAI Completion Models

**In Development. Not Very Helpful Yet.**

The grammar and spell checking feature of Nous uses OpenAI's completion models for feedback. You'll need an API key to OpenAI's which can securely entered into Nous's options through the command palette with the command `Nous: Set API key`. The grammar and spell checker is currently designed only for use with markdown files but will be developed to include plain text documents including $\LaTeX$, RMarkdown, etc...

