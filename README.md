# benchling-jira-scripts

Some JS functions to make it easier to interact with Jira programmatically via the Chrome console at
Benchling. Jira allows normal cookie auth for its REST API, so if you have a Jira tab open, you can
run reports and perform bulk actions using the REST API directly from the Chrome console and all
actions will be performed as your user.

## Simple usage

Paste this line into the Chrome console of a Jira tab to pull in the latest code and evaluate it in
the global scope:
```js
window['eval'](await (await fetch('https://benchling.github.io/benchling-jira-scripts/scripts.js')).text())
```

This adds a number of helper functions, as well as an `API` object for accessing the Jira API more
directly. Almost all exposed functions are async functions, so you should use `await` when calling
them.

```js
window['eval'](await (await fetch('https://benchling.github.io/benchling-jira-scripts/scripts.js')).text())
// Get issue by ID or key.
issue = await getIssue('BNCH-3489');
// Add the "adhoc" label to the issue.
await addLabel(issue.key, 'adhoc');
// Print key and assignee for all issues in a sprint.
(await getIssuesForSprint('Mad Scientists Q3a.3')).forEach(i => console.log(`${i.key}: ${i.assignee}`));
```

See the [source code](./scripts.js) for the full list of functions available.

## Making changes

If you want to add new utilities or modify existing ones (either for your own hacking or to share
with others), paste the code as a Chrome snippet:

![Chrome snippets example](https://benchling.github.io/benchling-jira-scripts/images/chrome-snippets-example.png)

From there, you can edit the code and hit Cmd+Enter to re-evaluate the snippet at any time, which
overwrites the previous function definitions.

If you're happy with the changes, clone the repo, paste the new code into your editor, run Prettier,
and submit as a PR!
