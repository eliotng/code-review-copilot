import * as vscode from 'vscode';
import { ReviewerChatParticipant } from './commands/reviewerChatParticipant';

export function activate(context: vscode.ExtensionContext) {
    const reviewer = new ReviewerChatParticipant();
    
    const chatParticipant = vscode.chat.createChatParticipant('code-review-copilot.reviewer', reviewer.handleChatRequest.bind(reviewer));
    chatParticipant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');
    
    context.subscriptions.push(chatParticipant);
    
    const reviewCommand = vscode.commands.registerCommand('code-review-copilot.reviewChanges', async () => {
        await vscode.commands.executeCommand('workbench.action.chat.open', '@reviewer');
    });
    
    context.subscriptions.push(reviewCommand);
}

export function deactivate() {}