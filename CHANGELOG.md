# Change Log

All notable changes to the "nous" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]


## [0.0.1] - 2024-12-09

- Initial release

### New Features:
  - **Markdown custom syntax highlighting**: Enhanced visualization for Markdown elements.
  - **Auto-enclosing `$...$`**: Automatically wrap selected text in `$` for inline math.

## [0.1.0] - 2024-12-10

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