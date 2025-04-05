import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { BugReport } from '../schemas/bug-report-schema.js';
import { octokit } from './octokit-client.js';

const client = new OpenAI();

const CLASSIFICATION_INSTRUCTIONS =
`Your task is to analyze a GitHub issue to determine whether it is a bug found by SQLancer and extract the following fields:

DBMS: Identify the DBMS the issue is associated with based on the repository or issue details.
This should be one of the DBMSs supported by SQLancer, or "N/A" otherwise.

Oracle: If the issue is a bug found by SQLancer, identify the test oracle used to find the bug. Otherwise, it should be "N/A".

Status: Classify the issue into one of the following statuses:

- Not a bug: The issue is not a bug found by SQLancer (e.g., it is unrelated to SQLancer, expected behavior, or a feature request).
- Open: The issue is a bug found by SQLancer that has not yet been fixed.
- Fixed: The issue is a bug found by SQLancer that has been resolved.
- Closed: The issue is a bug found by SQLancer that was closed without being fixed.`;

const TEXT_FORMAT = zodTextFormat(BugReport, 'bug_report');

function getPrompt(issue, comments, owner, repo) {
  return `Analyze the following GitHub issue and extract the appropriate values:

Repository: ${owner}/${repo}
State: ${issue.state}${issue.state_reason ? ` (${issue.state_reason})` : ''}
Title: ${issue.title}
Labels: ${issue.labels.map(label => label.name).join(', ')}

Description:
${issue.body}

Comments:
${comments.map(comment => comment.body).join('\n\n')}`;
}

async function callOpenAIWithStructuredOutput(prompt) {
  const response = await client.responses.create({
    model: 'gpt-4o',
    temperature: 0.2, // Lower values make responses more focused and deterministic.
    instructions: CLASSIFICATION_INSTRUCTIONS,
    input: prompt,
    text: {
      format: TEXT_FORMAT,
    },
  });

  return JSON.parse(response.output_text);
}

async function classifyGitHubIssue(issue) {
  const [owner, repo] = issue.repository_url.split('/').slice(-2);
  const {data: comments} = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issue.number,
  });

  const prompt = getPrompt(issue, comments, owner, repo);
  const bugReport = await callOpenAIWithStructuredOutput(prompt);

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
}

export async function classifyGitHubIssues(issues, batchSize = 200) {
  const results = [];

  for (let i = 0; i < issues.length; i += batchSize) {
    const batch = issues.slice(i, i + batchSize);

    const start = performance.now();
    const batchResults = await Promise.all(batch.map(classifyGitHubIssue));
    const end = performance.now();

    results.push(...batchResults);
    console.log(`Processed ${results.length} issues.`);

    const elapsed = end - start;
    const remaining = 60_000 - elapsed;

    if (i + batchSize < issues.length && remaining > 0) {
      console.log(`Sleeping for ${Math.ceil(remaining / 1000)} seconds before processing next batch...`);
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
  }

  return results;
}
