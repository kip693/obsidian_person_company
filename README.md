# Process Person Plugin

This is an Obsidian plugin designed for personal CRM and knowledge management. It leverages the xAI API to fetch and summarize information about people or companies based on email addresses or company domains, and appends the results to your Obsidian notes.

## Features

- If the YAML frontmatter of a note contains `#person` in the tags, the plugin will treat the note as a person and fetch information from xAI using the note title (as the name), and optionally `email`, `company`, and `title` if present.
- If the YAML frontmatter contains `#company` in the tags, the plugin will treat the note as a company and fetch information from xAI using the note title (as the company name) and `domain`.
- If neither tag is present, the plugin will prompt you to add one.
- All information is appended to the end of the note in Markdown format, with a clear section header.
- While fetching, a loading notification is shown.
- All actions are triggered from a single AI-themed ribbon button in the Obsidian UI.

## API Key Setup

1. After enabling the plugin, go to Obsidian **Settings → Community plugins → Process Person Plugin**.
2. Enter your xAI API key in the "xAI API Key" field.
3. If the API key is not set, the plugin will prompt you to enter it when you try to use the button.

## YAML Frontmatter Examples

### For a Person

```markdown
---
tags: [person]
email: example@example.com
company: Example Inc.
title: CTO
---
```

### For a Company

```markdown
---
tags: [company]
domain: example.com
---
```

## Output Format

- The fetched information is appended to the end of the note, separated by `---` and with a Markdown section header.
- For people: `# Person Info (from xAI):`
- For companies: `# Company Info (from xAI):`
- The xAI prompt includes all available fields (name, email, company, title, domain) as context.
- Output is always in Markdown, with headers starting from h2 or lower.

## Installation

1. Clone or download this repository.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Build the plugin:
   ```sh
   npm run build
   ```
4. Install to your Obsidian plugins folder with:
   ```sh
   make install
   ```

## Development

- Edit your logic in `src/main.ts`.
- Use TypeScript and run `npm run build` to compile.

---

This plugin uses the Obsidian API and xAI API.
