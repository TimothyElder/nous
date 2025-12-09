# Change Log

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.1] — 2024-12-09

- Initial release

### New Features:
  - **Markdown custom syntax highlighting**: Enhanced visualization for Markdown elements.
  - **Auto-enclosing `$...$`**: Automatically wrap selected text in `$` for inline math.

## [0.1.0] — 2024-12-10

### New Features
- **Grammar/Spell Checker**: Improved functionality for detecting and correcting grammar and spelling errors. Fully functional and useful for most text editing tasks.
- **Markdown Compiler**: Added support for compiling Markdown files to multiple formats (PDF, HTML, DOCX) using Pandoc.
- **Anonymize Command**: Replace selected text with underscores for quick anonymization.
- **Markdown Preprocessing**: Markdown compilation now removes curlybracket comments as well as replacing `$HOME` in the document with the user's home directory.

### Bug Fixes
- Resolved parsing issues with the grammar checker.
- Fixed decoration updates for corrections to avoid lingering underlines.

### Known Issues
- Grammar checker can still struggle with edge cases in text detection.
- Error ranges may shift slightly if multiple corrections are applied out of order.

## [0.1.1] — 2024-12-10

### Bug Fixes
- Resolved indexing issue for grammar/spell checker: indexing begins at the start of document rather than start of selection. 

## [0.1.5] — 2025-12-03

### New Features
- Llama LLM support for grammar and spell checking addded. 
- Markdown compilation tool now respects YAML front matter including pdf, docx, and html formatting options, default options added.

## [0.1.6] — 2025-12-09

### New Features
- Ported PandocCiter into Nous, for auto-completion of citations in markdown documents
- Added syntax highligting for footnotes

### Dev Notes
- Reorganized syntax highlighting, eliminated markdown.tmLanguage.json in favor of injection logic.
- README updated with suggested syntax highlighting settings