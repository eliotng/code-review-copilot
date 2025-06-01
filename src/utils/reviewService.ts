import * as vscode from 'vscode';
import { GitChange } from './gitService';

export interface ReviewResult {
    summary: string;
    issues: ReviewIssue[];
    improvements: string[];
}

export interface ReviewIssue {
    severity: 'error' | 'warning' | 'info';
    file: string;
    line: number;
    title: string;
    description: string;
    suggestion?: string;
}

export class ReviewService {
    async reviewChanges(
        changes: GitChange[],
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<ReviewResult> {
        const totalFiles = changes.reduce((sum, change) => sum + change.files.length, 0);
        const totalAdditions = changes.reduce((sum, change) => 
            sum + change.files.reduce((fileSum, file) => fileSum + file.additions, 0), 0);
        const totalDeletions = changes.reduce((sum, change) => 
            sum + change.files.reduce((fileSum, file) => fileSum + file.deletions, 0), 0);
        
        const fileTypes = new Map<string, number>();
        changes.forEach(change => {
            change.files.forEach(file => {
                const ext = file.file.split('.').pop() || 'no-extension';
                fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
            });
        });
        
        const reviewPrompt = this.createReviewPrompt(changes);
        
        const model = await this.getCopilotModel();
        if (!model) {
            throw new Error('GitHub Copilot is not available');
        }
        
        const messages = [
            vscode.LanguageModelChatMessage.User(reviewPrompt)
        ];
        
        const response = await model.sendRequest(messages, {}, token);
        
        const reviewContent = await this.collectResponse(response);
        const review = this.parseReviewResponse(reviewContent);
        
        const summary = `Reviewed ${changes.length} commits with ${totalFiles} files changed (+${totalAdditions} -${totalDeletions})`;
        
        return {
            summary: summary,
            issues: review.issues || [],
            improvements: review.improvements || []
        };
    }
    
    private createReviewPrompt(changes: GitChange[]): string {
        let prompt = `Please review the following code changes and provide:\n`;
        prompt += `1. Critical issues (bugs, security vulnerabilities, performance problems)\n`;
        prompt += `2. Code quality issues (style, best practices, maintainability)\n`;
        prompt += `3. Suggestions for improvements\n\n`;
        prompt += `Format your response as JSON with structure: { "issues": [...], "improvements": [...] }\n\n`;
        prompt += `Changes to review:\n\n`;
        
        changes.forEach(change => {
            prompt += `Commit: ${change.commitHash.substring(0, 7)} by ${change.author}\n`;
            prompt += `Message: ${change.message}\n`;
            prompt += `Files:\n`;
            
            change.files.forEach(file => {
                prompt += `\n--- ${file.file} (+${file.additions} -${file.deletions}) ---\n`;
                const diffLines = file.diff.split('\n').slice(0, 100);
                prompt += diffLines.join('\n');
                if (file.diff.split('\n').length > 100) {
                    prompt += '\n... (diff truncated) ...\n';
                }
            });
            
            prompt += '\n\n';
        });
        
        return prompt;
    }
    
    private async getCopilotModel(): Promise<vscode.LanguageModelChat | undefined> {
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: 'gpt-4'
        });
        
        return models[0];
    }
    
    private async collectResponse(response: vscode.LanguageModelChatResponse): Promise<string> {
        let content = '';
        for await (const part of response.text) {
            content += part;
        }
        return content;
    }
    
    private parseReviewResponse(content: string): any {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return {
                issues: [],
                improvements: []
            };
        } catch (error) {
            console.error('Failed to parse review response:', error);
            return {
                issues: [],
                improvements: []
            };
        }
    }
}