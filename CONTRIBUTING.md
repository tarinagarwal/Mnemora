# Contributing to Mnemora

First off, thank you for considering contributing to Mnemora! 🎉

It's people like you that make Mnemora such a great tool for privacy-conscious knowledge workers.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Style Guides](#style-guides)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **Environment details**:
  - OS and version
  - Node.js version
  - Python version
  - Ollama version and models

### 💡 Suggesting Features

Feature suggestions are welcome! Please:

1. Check if the feature has already been suggested
2. Provide a clear use case
3. Explain why this feature would be useful to most users
4. Consider the scope — is this a quick fix or a major change?

### 🔧 Pull Requests

1. Fork the repo and create your branch from `master`
2. Make your changes
3. Add tests if applicable
4. Ensure the test suite passes
5. Update documentation as needed
6. Issue the pull request

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Ollama with models pulled

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Mnemora.git
cd Mnemora

# Install dependencies
npm install
cd backend && pip install -r requirements.txt && cd ..

# Start development
# Terminal 1: ollama serve
# Terminal 2: cd backend && python main.py
# Terminal 3: npm run electron
```

## Style Guides

### JavaScript/React

- Use ES6+ features
- Functional components with hooks
- Meaningful component and variable names
- JSDoc comments for complex functions

### Python

- Follow PEP 8
- Use type hints
- Docstrings for all public functions
- Async/await for I/O operations

### CSS

- Use Tailwind utility classes
- Custom CSS only when necessary
- Follow the existing color scheme

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```
feat(chat): add streaming response support
fix(indexer): handle PDFs with special characters
docs(readme): update installation instructions
```

## Pull Request Process

1. **Update documentation** — README, comments, etc.
2. **Add tests** — for new functionality
3. **Follow the style guide** — consistent code style
4. **Single focus** — one PR per feature/fix
5. **Descriptive title** — summarize the change
6. **Link issues** — reference related issues

### PR Template

Your PR description should include:

- **What** does this PR do?
- **Why** is this change needed?
- **How** was it implemented?
- **Testing** — how was it tested?
- **Screenshots** — if UI changes

## Questions?

Feel free to open an issue with the "question" label or start a discussion.

Thank you for contributing! 🚀
