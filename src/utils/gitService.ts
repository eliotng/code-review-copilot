import simpleGit, { SimpleGit, LogResult, DiffResult, DiffResultTextFile } from 'simple-git';
import * as path from 'path';

export interface GitChange {
    commitHash: string;
    author: string;
    date: Date;
    message: string;
    files: FileChange[];
}

export interface FileChange {
    file: string;
    additions: number;
    deletions: number;
    changes: string;
    diff: string;
}

export class GitService {
    private git!: SimpleGit;
    
    async getChangesBetweenDates(repoPath: string, startDate: Date, endDate: Date): Promise<GitChange[]> {
        this.git = simpleGit(repoPath);
        
        const logOptions = {
            from: startDate.toISOString(),
            to: endDate.toISOString(),
            '--no-merges': null
        };
        
        const log: LogResult = await this.git.log(logOptions);
        const changes: GitChange[] = [];
        
        for (const commit of log.all) {
            const commitChanges = await this.getCommitChanges(commit.hash);
            
            changes.push({
                commitHash: commit.hash,
                author: commit.author_name,
                date: new Date(commit.date),
                message: commit.message,
                files: commitChanges
            });
        }
        
        return changes;
    }
    
    private async getCommitChanges(commitHash: string): Promise<FileChange[]> {
        const diffSummary = await this.git.diffSummary([`${commitHash}^`, commitHash]);
        const fileChanges: FileChange[] = [];
        
        for (const file of diffSummary.files) {
            try {
                const diff = await this.git.diff([`${commitHash}^`, commitHash, '--', file.file]);
                
                if ('insertions' in file && 'deletions' in file && 'changes' in file) {
                    fileChanges.push({
                        file: file.file,
                        additions: file.insertions,
                        deletions: file.deletions,
                        changes: file.changes.toString(),
                        diff: diff
                    });
                } else {
                    fileChanges.push({
                        file: file.file,
                        additions: 0,
                        deletions: 0,
                        changes: '0',
                        diff: diff
                    });
                }
            } catch (error) {
                console.error(`Error getting diff for file ${file.file}:`, error);
            }
        }
        
        return fileChanges;
    }
}