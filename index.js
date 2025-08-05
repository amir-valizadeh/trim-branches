#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

// Initialize git
const git = simpleGit();

// Package info
const packageJson = require('./package.json');

class BranchPruner {
    constructor(options = {}) {
        this.mainBranch = options.mainBranch || 'main';
        this.dryRun = options.dryRun || false;
        this.force = options.force || false;
        this.keepDevelop = options.keepDevelop !== false;
    }

    log(color, icon, message) {
        console.log(chalk[color](`${icon} ${message}`));
    }

    async checkGitRepository() {
        try {
            await git.checkIsRepo();
        } catch (error) {
            this.log('red', '❌', 'Error: Not in a git repository');
            process.exit(1);
        }
    }

    async fetchLatest() {
        this.log('yellow', '📡', 'Fetching latest changes from origin...');
        try {
            await git.fetch('origin', { '--prune': null });
        } catch (error) {
            this.log('red', '❌', 'Error fetching from origin');
            throw error;
        }
    }

    async checkMainBranch() {
        try {
            const branches = await git.branch(['-r']);
            const mainBranchRef = `origin/${this.mainBranch}`;

            if (!branches.all.includes(mainBranchRef)) {
                this.log('red', '❌', `Error: Main branch 'origin/${this.mainBranch}' not found`);
                this.log('yellow', '📋', 'Available branches:');
                branches.all.slice(0, 10).forEach(branch => {
                    console.log(`  ${branch}`);
                });
                process.exit(1);
            }
        } catch (error) {
            this.log('red', '❌', 'Error checking main branch');
            throw error;
        }
    }

    async getMergedBranches() {
        this.log('yellow', '🔍', 'Finding merged branches...');

        try {
            // Get all remote branches merged into main
            const result = await git.branch(['-r', '--merged', `origin/${this.mainBranch}`]);

            let mergedBranches = result.all
                .filter(branch => !branch.includes(' -> ')) // Remove symbolic refs
                .filter(branch => !branch.endsWith(`origin/${this.mainBranch}`)) // Remove main branch
                .map(branch => branch.replace('origin/', '').trim());

            // Filter out branches we want to keep
            const filteredBranches = [];

            for (const branch of mergedBranches) {
                // Skip main branch
                if (branch === this.mainBranch) continue;

                // Skip develop branch if keeping it
                if (this.keepDevelop && branch === 'develop') {
                    this.log('yellow', '⚠️', "Keeping 'develop' branch (use --no-keep-develop to remove)");
                    continue;
                }

                // Skip HEAD
                if (branch === 'HEAD') continue;

                filteredBranches.push(branch);
            }

            return filteredBranches;
        } catch (error) {
            this.log('red', '❌', 'Error finding merged branches');
            throw error;
        }
    }

    async getBranchInfo(branch) {
        try {
            const log = await git.log({
                from: `origin/${branch}`,
                maxCount: 1
            });

            if (log.latest) {
                return {
                    hash: log.latest.hash.substring(0, 7),
                    message: log.latest.message,
                    author: log.latest.author_name,
                    date: log.latest.date
                };
            }

            return {
                hash: 'unknown',
                message: 'unknown',
                author: 'unknown',
                date: 'unknown'
            };
        } catch (error) {
            return {
                hash: 'unknown',
                message: 'unknown',
                author: 'unknown',
                date: 'unknown'
            };
        }
    }

    async displayBranches(branches) {
        this.log('yellow', '📋', 'Found the following merged branches:');

        for (const branch of branches) {
            const info = await this.getBranchInfo(branch);
            const relativeDate = this.getRelativeDate(info.date);

            console.log(chalk.blue(`  • ${branch}`));
            console.log(`    Last commit: ${info.hash} ${info.message}`);
            console.log(`    Author: ${info.author} (${relativeDate})`);
            console.log('');
        }
    }

    getRelativeDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'today';
            if (diffDays === 1) return 'yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return `${Math.floor(diffDays / 365)} years ago`;
        } catch (error) {
            return 'unknown';
        }
    }

    async confirmDeletion(branches) {
        if (this.force) return true;

        console.log('');
        this.log('yellow', '⚠️', 'This will permanently delete the above branches from origin!');

        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Are you sure you want to continue?',
                default: false
            }
        ]);

        return confirmed;
    }

    async deleteBranches(branches) {
        this.log('red', '🗑️', 'Deleting merged branches from origin...');

        let deletedCount = 0;
        let failedCount = 0;

        for (const branch of branches) {
            try {
                console.log(chalk.yellow(`Deleting origin/${branch}...`));
                await git.push('origin', branch, { '--delete': null });
                this.log('green', '✅', `Deleted origin/${branch}`);
                deletedCount++;
            } catch (error) {
                this.log('red', '❌', `Failed to delete origin/${branch}`);
                failedCount++;
            }
        }

        return { deletedCount, failedCount };
    }

    async cleanupLocal() {
        this.log('yellow', '🧹', 'Cleaning up local tracking branches...');
        try {
            await git.remote(['prune', 'origin']);
        } catch (error) {
            this.log('yellow', '⚠️', 'Warning: Could not prune local tracking branches');
        }
    }

    async getRemainingBranchCount() {
        try {
            const branches = await git.branch(['-r']);
            return branches.all.filter(branch => !branch.includes(' -> ')).length;
        } catch (error) {
            return 'unknown';
        }
    }

    async run() {
        try {
            this.log('blue', '🚀', 'Starting merged branch cleanup...');

            await this.checkGitRepository();
            await this.fetchLatest();
            await this.checkMainBranch();

            const branches = await this.getMergedBranches();

            if (branches.length === 0) {
                this.log('green', '✅', 'No merged branches found to delete');
                return;
            }

            await this.displayBranches(branches);

            if (this.dryRun) {
                this.log('yellow', '🔍', 'DRY RUN: The above branches would be deleted from origin');
                this.log('yellow', '💡', 'Run without --dry-run to actually delete them');
                return;
            }

            const confirmed = await this.confirmDeletion(branches);
            if (!confirmed) {
                this.log('yellow', '⏹️', 'Operation cancelled');
                return;
            }

            const { deletedCount, failedCount } = await this.deleteBranches(branches);
            await this.cleanupLocal();

            // Summary
            console.log('');
            this.log('green', '🎉', 'Cleanup complete!');
            this.log('green', '✅', `Deleted: ${deletedCount} branches`);

            if (failedCount > 0) {
                this.log('red', '❌', `Failed: ${failedCount} branches`);
            }

            const remainingCount = await this.getRemainingBranchCount();
            this.log('blue', '📊', `Remaining remote branches: ${remainingCount}`);

            this.log('yellow', '💡', "Tip: Run 'git branch -vv' to see if you have any local branches tracking deleted remotes");

        } catch (error) {
            this.log('red', '❌', `Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// CLI Setup
const program = new Command();

program
    .name('trim-branches')
    .description('Trim merged branches from git origin')
    .version(packageJson.version)
    .option('-m, --main <branch>', 'Set main branch', 'main')
    .option('-d, --dry-run', 'Show what would be deleted without actually deleting', false)
    .option('-f, --force', 'Skip confirmation prompts', false)
    .option('--no-keep-develop', 'Also remove develop branch if merged')
    .action(async (options) => {
        const pruner = new BranchPruner({
            mainBranch: options.main,
            dryRun: options.dryRun,
            force: options.force,
            keepDevelop: options.keepDevelop
        });

        await pruner.run();
    });

// Add examples to help
program.addHelpText('after', `
Examples:
  $ trim-branches --dry-run          # See what would be deleted
  $ trim-branches -f                 # Delete without confirmation
  $ trim-branches -m master          # Use 'master' as main branch
`);

program.parse();