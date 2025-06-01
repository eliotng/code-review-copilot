import * as vscode from 'vscode';
import { GitService } from '../utils/gitService';
import { ReviewService } from '../utils/reviewService';

export class ReviewerChatParticipant {
    private gitService: GitService;
    private reviewService: ReviewService;
    
    constructor() {
        this.gitService = new GitService();
        this.reviewService = new ReviewService();
    }
    
    async handleChatRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            stream.markdown('No workspace folder found. Please open a folder with a git repository.');
            return;
        }
        
        const dateRange = this.parseDateRange(request.prompt);
        if (!dateRange) {
            stream.markdown('Please provide two dates in the format: YYYY-MM-DD to YYYY-MM-DD\n\nExample: Review changes from 2024-01-01 to 2024-01-31');
            return;
        }
        
        stream.progress('Fetching git changes...');
        
        try {
            const changes = await this.gitService.getChangesBetweenDates(
                workspaceFolder.uri.fsPath,
                dateRange.startDate,
                dateRange.endDate
            );
            
            if (changes.length === 0) {
                stream.markdown('No changes found in the specified date range.');
                return;
            }
            
            stream.progress('Analyzing changes...');
            
            const review = await this.reviewService.reviewChanges(changes, stream, token);
            
            stream.markdown('## Code Review Summary\n\n');
            stream.markdown(review.summary);
            
            if (review.issues.length > 0) {
                stream.markdown('\n\n## Issues Found\n\n');
                for (const issue of review.issues) {
                    stream.markdown(`### ${issue.severity}: ${issue.title}\n`);
                    stream.markdown(`**File:** ${issue.file}:${issue.line}\n`);
                    stream.markdown(`${issue.description}\n\n`);
                    if (issue.suggestion) {
                        stream.markdown(`**Suggestion:** ${issue.suggestion}\n\n`);
                    }
                }
            }
            
            if (review.improvements.length > 0) {
                stream.markdown('\n\n## Suggested Improvements\n\n');
                for (const improvement of review.improvements) {
                    stream.markdown(`- ${improvement}\n`);
                }
            }
            
        } catch (error) {
            stream.markdown(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        }
    }
    
    private parseDateRange(prompt: string): { startDate: Date; endDate: Date } | null {
        const datePattern = /(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i;
        const match = prompt.match(datePattern);
        
        if (!match) {
            return null;
        }
        
        const startDate = new Date(match[1]);
        const endDate = new Date(match[2]);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return null;
        }
        
        endDate.setHours(23, 59, 59, 999);
        
        return { startDate, endDate };
    }
}