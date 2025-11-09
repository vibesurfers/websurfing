# Safe Startup Script

## Purpose

The `start-safe.sh` script prevents common development issues that cause the recurring ENOENT build-manifest.json errors and webpack/turbopack conflicts.

## Usage

```bash
# Basic startup (recommended)
./start-safe.sh

# Deep clean and reinstall dependencies
./start-safe.sh --clean

# Force use Turbopack (not recommended with current webpack config)
./start-safe.sh --turbo
```

## What It Does

1. **🔍 Process Cleanup**: Kills any existing Next.js processes for this project
2. **🎯 Port Management**: Ensures port 3000 is available (kills conflicting processes)
3. **🧹 Cache Cleanup**: Removes `.next`, `node_modules/.cache`, and `.swc` directories
4. **⚖️ Build System Detection**: Chooses webpack vs. turbopack intelligently
5. **🚀 Clean Startup**: Starts development server on port 3000

## Why This Script Exists

### The Problem
- **Turbopack conflicts**: `npm run dev --turbo` ignores webpack configurations in `next.config.js`
- **Mixed build artifacts**: Cached files from different build systems conflict
- **Zombie processes**: Multiple Next.js instances running simultaneously
- **Port conflicts**: Development servers starting on random ports

### The Solution
- **Intelligent build system selection**: Uses webpack by default (supports your config)
- **Clean slate startup**: Removes conflicting cache files
- **Process management**: Ensures only one clean instance runs
- **Consistent port**: Always uses port 3000

## Flags

- `--clean`: Deep clean including `node_modules` reinstall
- `--turbo`: Force Turbopack usage (webpack config will be ignored)

## Examples

```bash
# Standard development startup
./start-safe.sh

# After package.json changes or weird errors
./start-safe.sh --clean

# Test Turbopack (experimental, may break due to webpack config)
./start-safe.sh --turbo
```

## Integration

You can also alias this in your shell:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias dev-safe='cd ~/hackathons/yc-vibecon && ./start-safe.sh'
```

Then just run `dev-safe` from anywhere.

## Troubleshooting

If you still see ENOENT errors after using this script:
1. Try `./start-safe.sh --clean` for a deep reset
2. Check that no other Next.js projects are running
3. Ensure you don't have multiple terminal sessions running dev servers

This script specifically addresses the webpack/turbopack configuration conflicts that were causing your recurring build manifest errors.