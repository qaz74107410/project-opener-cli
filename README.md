# Project Opener

A powerful CLI tool to quickly search and open your coding projects in VS Code. Organize projects by company, search with fuzzy finding, and access them from anywhere in your terminal.

## Features

- **Quick Access**: Open projects directly by name from any directory
- **Company Grouping**: Organize projects by company/client
- **Interactive Search**: Fuzzy search with real-time filtering
- **Project Scanning**: Automatically detect projects in directories
- **Tab Completion**: Bash and Zsh auto-completion support
- **Colorful UI**: Easy-to-read colored output

## Installation

```bash
# Clone or create a directory for the project
mkdir -p ~/tools/project-opener
cd ~/tools/project-opener

# Create the necessary files from the provided artifacts
# - Save the main script as index.js
# - Save the package.json file

# Install dependencies
npm install

# Make the script executable
chmod +x index.js

# Install globally
npm install -g .
```

## Configuration

Project Opener stores all configuration in a JSON file:

```
~/.project-opener.json
```

This file contains:
- List of your projects with paths and company associations
- Company groupings
- VS Code command settings
- Base path for project scanning

You can edit this file manually if needed, but it's recommended to use the CLI commands to make changes.

## Setting Up Alias

For even faster access, set up an alias in your shell configuration file:

### For Bash (in ~/.bashrc or ~/.bash_profile)

```bash
# Add this line to your .bashrc or .bash_profile
alias pj="project-opener"
```

### For Zsh (in ~/.zshrc)

```bash
# Add this line to your .zshrc
alias pj="project-opener"
```

After adding the alias, reload your configuration:

```bash
# For Bash
source ~/.bashrc
# or
source ~/.bash_profile

# For Zsh
source ~/.zshrc
```

Now you can use `pj` instead of `project-opener` for all commands:

```bash
# Examples with the alias
pj add my-project ~/code/my-project
pj list
pj open my-project
pj i   # Interactive mode
```

## Setting Up Auto-completion

### For Bash

```bash
# Save the bash completion script
mkdir -p ~/.bash_completion.d
cp bash-completion-script ~/.bash_completion.d/project-opener

# Add this to your ~/.bashrc or ~/.bash_profile
echo 'source ~/.bash_completion.d/project-opener' >> ~/.bashrc

# Apply changes
source ~/.bashrc
```

### For Zsh

```bash
# Create the completions directory
mkdir -p ~/.zsh/completions

# Save the zsh completion script
cp zsh-completion-script ~/.zsh/completions/_project-opener

# Add to your ~/.zshrc
echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc
echo 'autoload -U compinit' >> ~/.zshrc
echo 'compinit' >> ~/.zshrc

# Apply changes
source ~/.zshrc
```

## Basic Usage

```bash
# Add a project
pj add my-project ~/path/to/project

# Add a project with company
pj add client-website ~/client/website --company client-name

# List all projects
pj list

# List projects for a specific company
pj list --company client-name

# Open a project
pj open my-project

# Search for projects
pj search website

# Enter interactive mode (default when no command is provided)
pj
```

## Company Management

```bash
# List all companies
pj companies

# Scan a directory and assign projects to a company
pj scan ~/code --company client-name
```

## Advanced Usage

### Interactive Mode

Simply run `pj` or `pj i` to enter interactive mode, which allows you to:

1. Select a company to filter by (or "All Companies")
2. Search for a project using fuzzy finding
3. Select and open the project

### Scanning for Projects

```bash
# Scan your code directory for projects
pj scan ~/code

# You can select which discovered projects to add
# and optionally assign them all to a company
```

### Customizing VS Code Command

```bash
# If you need a different command to open VS Code
pj set-vscode-cmd code-insiders

# Set base path for your projects
pj set-base-path ~/development
```

### Directly Editing Configuration

If needed, you can manually edit the configuration file:
```bash
# Open the config file in VS Code
code ~/.project-opener.json

# Or with vim
vim ~/.project-opener.json
```

Be careful when editing directly to maintain the proper JSON structure.

## Tips & Tricks

1. **Run without command**: Simply typing `pj` launches interactive mode
2. **Tab completion**: Use tab to complete project names and commands
3. **Path flexibility**: Add projects using relative paths, absolute paths, or home-relative paths (`~`)
4. **Search flexibility**: Search works across project names, paths, and company names

## Troubleshooting

### Command not found

```bash
# Check if installed globally
npm list -g project-opener

# Make sure npm global bin is in your PATH
echo $PATH | grep -o "$(npm config get prefix)/bin"
```

### Auto-completion not working

```bash
# For Bash
source ~/.bash_completion.d/project-opener

# For Zsh
rm -f ~/.zcompdump; compinit
```

## Contributing

Feel free to enhance the tool with additional features like:
- Git integration
- Project templates
- More IDE support
- Statistics tracking

---

Happy coding! 🚀