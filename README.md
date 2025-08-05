# Trim Branches

A CLI tool to trim merged branches from your git origin remote. Keep your repository clean by automatically identifying and deleting branches that have been merged into your main branch.

## Features

- 🔍 **Smart Detection** - Automatically finds branches merged into main/master
- 🛡️ **Safe Defaults** - Preserves important branches like `develop` by default
- 🔥 **Dry Run Mode** - Preview what will be deleted before making changes
- 🎨 **Beautiful Output** - Colored output with branch information and commit details
- ⚡ **Fast** - Built on Node.js for cross-platform compatibility
- 🤖 **Interactive** - Confirmation prompts to prevent accidents

## Installation

### Global Installation (Recommended)

```bash
npm install -g trim-branches
```

### Local Installation

```bash
npm install trim-branches
npx trim-branches --help
```

## Usage

### Basic Usage

```bash
# Preview what would be deleted (recommended first step)
trim-branches --dry-run

# Delete merged branches with confirmation
trim-branches

# Delete without confirmation prompts
trim-branches --force
```

### Advanced Usage

```bash
# Use a different main branch
trim-branches --main master

# Also remove develop branch if merged
trim-branches --no-keep-develop

# Combine options
trim-branches --main master --force --no-keep-develop
```

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--main <branch>` | `-m` | Set the main branch name | `main` |
| `--dry-run` | `-d` | Show what would be deleted without deleting | `false` |
| `--force` | `-f` | Skip confirmation prompts | `false` |
| `--no-keep-develop` | | Also remove develop branch if merged | Keep develop |
| `--help` | `-h` | Show help message | |
| `--version` | `-V` | Show version number | |

## Examples

### 1. Safe Preview
```bash
trim-branches --dry-run
```
Output:
```
🚀 Starting merged branch cleanup...
📡 Fetching latest changes from origin...
🔍 Finding merged branches...
📋 Found the following merged branches:
  • feature/user-auth
    Last commit: a1b2c3d Add login functionality
    Author: John Doe (2 days ago)

  • bugfix/header-styling  
    Last commit: d4e5f6g Fix header alignment
    Author: Jane Smith (1 week ago)

🔍 DRY RUN: The above branches would be deleted from origin
💡 Run without --dry-run to actually delete them
```

### 2. Interactive Deletion
```bash
trim-branches
```
```
🚀 Starting merged branch cleanup...
📡 Fetching latest changes from origin...
🔍 Finding merged branches...
📋 Found the following merged branches:
  • feature/user-auth
  • bugfix/header-styling

⚠️  This will permanently delete the above branches from origin!
? Are you sure you want to continue? (y/N) y

🗑️  Deleting merged branches from origin...
✅ Deleted origin/feature/user-auth
✅ Deleted origin/bugfix/header-styling
🧹 Cleaning up local tracking branches...

🎉 Cleanup complete!
✅ Deleted: 2 branches
📊 Remaining remote branches: 3
💡 Tip: Run 'git branch -vv' to see local branches tracking deleted remotes
```

## Safety Features

### Protected Branches
By default, these branches are never deleted:
- Your main branch (specified with `--main`)
- `develop` (unless `--no-keep-develop` is used)
- `HEAD` and other git references

### Confirmation Required
Unless you use `--force`, you'll always be asked to confirm before deleting branches.

### Detailed Information
Before deletion, you'll see:
- Branch name
- Last commit hash and message
- Author name
- Relative date of last commit

## Requirements

- Node.js 14.0.0 or higher
- Git repository with origin remote
- Git command line tools installed

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### 1.0.0
- Initial release
- Basic branch pruning functionality
- Dry run mode
- Interactive confirmations
- Colored output
- Cross-platform support