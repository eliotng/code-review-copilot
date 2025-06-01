# Code Review Copilot

A GitHub Copilot Chat extension for reviewing code changes between two dates.

## Features

- Review all code changes between two specified dates
- Leverages GitHub Copilot to analyze code quality
- Identifies bugs, security issues, and performance problems
- Provides suggestions for improvements
- Integrates seamlessly with VS Code's chat interface

## Usage

1. Open the GitHub Copilot Chat panel in VS Code
2. Type `@reviewer` followed by your date range
3. Format: `@reviewer Review changes from YYYY-MM-DD to YYYY-MM-DD`

Example:
```
@reviewer Review changes from 2024-01-01 to 2024-01-31
```

## Requirements

- VS Code 1.85.0 or higher
- GitHub Copilot Chat extension
- Git repository in your workspace

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch a new VS Code window with the extension loaded

## Development

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and recompile
- `npm run lint` - Run ESLint

## Extension Settings

This extension contributes the following:

- Chat participant: `@reviewer`
- Command: `Code Review: Review Code Changes`