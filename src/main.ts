import * as core from '@actions/core';
import { shouldSkipBranch } from './utils';
import { getInputs } from './action-inputs';
import { GithubConnector } from './github-connector';
import { JiraConnector } from './jira-connector';

async function run(): Promise<void> {
  try {
    const { BRANCH_IGNORE_PATTERN } = getInputs();

    const githubConnector = new GithubConnector();
    const jiraConnector = new JiraConnector();

    if (!githubConnector.isPRAction) {
      console.log('This action meant to be run only on PRs');
      process.exit(0);
    }

    const skipBranch = shouldSkipBranch(githubConnector.headBranch, BRANCH_IGNORE_PATTERN);

    if (skipBranch) {
      console.log('Skipping action on this branch');
      process.exit(1);
    }

    const issueKeys = githubConnector.getIssueKeysFromTitle();

    if (!issueKeys) {
      console.log('Could not find any issue keys');
      process.exit(1);
    }

    console.log(`Fetching details for JIRA keys ${issueKeys}`);
    const tickets = await Promise.all(issueKeys.map((issueKey) => jiraConnector.getTicketDetails(issueKey)));

    console.log(`Updating PR description with the following JIRA ticket info: ${JSON.stringify(tickets)}`);
    await githubConnector.updatePrDetails(tickets);

    console.log('Done!');
  } catch (error) {
    console.log({ error });
    core.setFailed(error.message);
    process.exit(1);
  }
}

run();
