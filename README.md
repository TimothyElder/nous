# nous

Nous is for researchers and writers who are doing their work using plain text files. These include Markdown, LaTeX, RMarkdown, sweave and many more. Nous is meant to make your life easier by including compilation settings for pandoc and its extensions natively, so you don't have to go through the unfortunate process your self of setting up make files or working on the command line when you are writing and compiling. 

Most importantly Nous includes a grammar and spell checker to help make your work more better! Using the OpenAI API for completions from their GPT models it will help to fix spelling and grammatical errors.

## Markdown Syntax

Nous comes with some slight customizations to how markdown works. The standard behavior of comments in markdown documents in VS Code is to only allow comments around complete lines of the document using `<!--  -->`. These can also be used inline, but are annoying to type. Nous includes inline comments that will leave text in the source but exclude it from compiled versions of the document. This can be helpful for qualitative researchers who want to exclude text from or around quotations without deleting it entirely. This can be helpful for editing long quotes or leaving in identifiers that help you tie quotations back to the respondents ID. This inline comment is used with double curlybrackets `{{...}}`. Here is an example of how they can be used:

```markdown
Dr. Potter, a palliative care attending in the Midwest descibes that:

>communication is our procedure...that has a level of expertise, the level of skill, level of protocol,{{ if you will,}} that may be similar, or different, but may have parallels to{{, you know,}} what a more traditional proceduralist, a vascular surgeon, a neurosurgeon might do. {{So I think that I think that does ring true that we,}} That is something we spend a lot of time on, that we have training in, we have an appreciation of, we enjoy doing it, for the most part, we have time to do it.{{ Right.}} There’s also an economy of time, right? That I will have more time than, you know, an internal medicine doctor who as eight different patients they need to see that afternoon. Whereas I have three patients I need to see for example. {{ PAL-PH/A-013 Midwest Male Attending }}
```

## Markdown Compilation

Nous also comes with a compilation toolchain for markdown documents that will help you speed up compilation of documents.

## Grammar Checking with OpenAI models

