import { octokit } from './octokit-client.js';

async function fetchPaginatedGitHubIssues(query) {
  return await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
    q: query,
    sort: 'updated',
    order: 'desc',
    per_page: 100,
  });
}

export async function fetchAllGitHubIssues() {
  const allIssues = [];
  let lastUpdatedAt = null;

  while (true) {
    let query = 'sqlancer is:issue';
    if (lastUpdatedAt) {
      query += ` updated:<${lastUpdatedAt}`;
    }

    const issues = await fetchPaginatedGitHubIssues(query);
    if (!issues.length) break;

    allIssues.push(...issues);
    lastUpdatedAt = issues[issues.length - 1].updated_at;
  }

  return allIssues;
}

export async function fetchUpdatedGitHubIssues(latestUpdatedAt) {
  const query = `sqlancer is:issue updated:>${latestUpdatedAt}`;
  return await fetchPaginatedGitHubIssues(query);
}
