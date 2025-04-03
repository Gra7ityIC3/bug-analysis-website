import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { BugReport } from '../schemas/bug-report-schema.js';
import { octokit } from './octokit-client.js';

const openai = new OpenAI();

function getPromptAndResponseFormat(issue, comments, owner, repo) {
  const prompt = `Your task is to analyze a GitHub issue to determine whether it is a bug found by SQLancer and extract the following fields:

DBMS: Identify the DBMS the issue is associated with based on the repository or issue details.
This should be one of the DBMSs supported by SQLancer, or "N/A" otherwise.

Oracle: If the issue is a bug found by SQLancer, identify the test oracle used to find the bug. Otherwise, it should be "N/A".

Status: Classify the issue into one of the following statuses:

- Not a bug: The issue is not a bug found by SQLancer (e.g., it is unrelated to SQLancer, expected behavior, or a feature request).
- Open: The issue is a bug found by SQLancer that has not yet been fixed.
- Fixed: The issue is a bug found by SQLancer that has been resolved.
- Closed: The issue is a bug found by SQLancer that was closed without being fixed.

Now, extract the appropriate values based on the following issue:

Repository: ${owner}/${repo}
State: ${issue.state}${issue.state_reason ? ` (${issue.state_reason})` : ''}
Title: ${issue.title}
Labels: ${issue.labels.map(label => label.name).join(', ')}

Description:
${issue.body}

Comments:
${comments.map(comment => comment.body).join('\n\n')}`

  return { prompt, responseFormat: zodResponseFormat(BugReport, 'bug_report') };
}

async function callOpenAIWithStructuredOutput(content, responseFormat) {
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini', // GPT-4o would exceed the TPM limit even at tier 3.
    temperature: 0.2, // Lower values make responses more focused and deterministic.
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant specialized in analyzing GitHub issues for bugs found by SQLancer.'
      },
      { role: 'user', content: content },
    ],
    response_format: responseFormat
  });

  return completion.choices[0].message.parsed;
}

export async function classifyGitHubIssues(issues) {
  return await Promise.all(
    issues.map(async issue => {
      const [owner, repo] = issue.repository_url.split('/').slice(-2);
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
      });

      const { prompt, responseFormat } = getPromptAndResponseFormat(issue, comments, owner, repo);
      const bugReport = await callOpenAIWithStructuredOutput(prompt, responseFormat);

      return {
        creator: issue.user.login,
        title: issue.title,
        description: issue.body,
        dbms: bugReport.dbms,
        oracle: bugReport.oracle,
        status: bugReport.status,
        html_url: issue.html_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    })
  );
}
