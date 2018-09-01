async function getJSON(url) {
  const response = await fetch(url);
  return await response.json();
}

async function putJSON(url, data) {
  await fetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {'Content-Type': 'application/json; charset=utf-8'},
  });
}

async function getPaginated(url, resultsKey = 'values') {
  if (!url.includes('?')) {
    url = `${url}?`;
  }
  const results = [];
  while (true) {
    const json = await getJSON(`${url}&startAt=${results.length}`);
    results.push(...json[resultsKey]);
    if (json[resultsKey].length < 50) {
      break;
    }
  }
  return results;
}

var API = {
  // https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-issue-issueIdOrKey-get
  getIssue: (issueId) => getJSON(`/rest/api/2/issue/${issueId}?expand=names`),
  // https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-issue-issueIdOrKey-put
  editIssue: (issueId, editBody) => putJSON(`/rest/api/2/issue/${issueId}`, editBody),
  // https://developer.atlassian.com/cloud/jira/software/rest/#api-board-get
  getAllBoards: () => getPaginated(`/rest/agile/1.0/board`),
  // https://developer.atlassian.com/cloud/jira/software/rest/#api-board-boardId-sprint-get
  getAllSprintsForBoard: (boardId) => getPaginated(`/rest/agile/1.0/board/${boardId}/sprint`),
  // https://developer.atlassian.com/cloud/jira/software/rest/#api-sprint-sprintId-issue-get
  getIssuesForSprint: (sprintId) => getPaginated(`/rest/agile/1.0/sprint/${sprintId}/issue`, 'issues'),
};

async function getIssue(issueId) {
  return simplifyIssue(await API.getIssue(issueId));
}

async function addLabel(issueId, label) {
  await API.editIssue(issueId, {update: {labels: [{add: label}]}});
}

async function initializeSprintGoal(sprintName) {
  for (const issue of await getIssuesForSprint(sprintName)) {
    await addLabel(issue.key, 'sprint-goal');
    await addLabel(issue.key, 'original-sprint-goal');
  }
}

function simplifyIssue(issueJSON) {
  const result = {raw: {}};
  for (const [key, value] of Object.entries(issueJSON.fields)) {
    result.raw[issueJSON.names[key]] = value;
  }
  result.key = issueJSON.key;
  result.summary = result.raw['Summary'];
  result.assignee = result.raw['Assignee'] ? result.raw['Assignee'].name : '(Unassigned)';
  result.labels = result.raw['Labels'];
  result.status = result.raw['Status'].name;
  result.points = result.raw['Story Points'];
  result.pointsSpent = result.raw['Points Spent'];
  return result;
}

async function getSprintIdByName(sprintName) {
  for (const board of await API.getAllBoards()) {
    for (const sprint of await API.getAllSprintsForBoard(board.id)) {
      if (sprint.name === sprintName) {
        return sprint.id;
      }
    }
  }
  throw new Error(`Sprint name ${sprintName} not found!`);
}

async function getIssuesForSprint(sprintName) {
  console.log('Finding sprint...');
  const sprintId = await getSprintIdByName(sprintName);
  const results = [];
  console.log('Getting issues...');
  for (const issue of await API.getIssuesForSprint(sprintId)) {
    results.push(await getIssue(issue.id));
  }
  return results;
}

var STATUSES = ['Done', 'Landed', 'Invalid', "Won't Do", 'In Review', 'In Progress', 'Open', 'Blocked'];
var DONE_STATUSES = ['Done', 'Landed', 'Invalid', "Won't Do"];

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function generateSprintReportFromIssues(issues) {
  issues.sort((issue1, issue2) => {
    if (STATUSES.indexOf(issue1.status) < STATUSES.indexOf(issue2.status)) {
      return -1;
    } else if (STATUSES.indexOf(issue1.status) > STATUSES.indexOf(issue2.status)) {
      return 1;
    }
    return issue1.assignee.localeCompare(issue2.assignee);
  });
  const rows = issues.map((issue) => [
    issue.key,
    issue.summary,
    issue.assignee,
    issue.status,
    issue.points,
    issue.pointsSpent,
  ]);

  const pointsDone = sum(
    issues.filter((issue) => DONE_STATUSES.includes(issue.status)).map((issue) => issue.points)
  );
  const pointsTotal = sum(issues.map((issue) => issue.points));
  rows.push(['', 'Done', '', '', pointsDone, '']);
  rows.push(['', 'Not done', '', '', pointsTotal - pointsDone, '']);
  rows.push(['', 'Total', '', '', pointsTotal, '']);
  rows.push(['', '% Complete', '', '', (pointsDone / pointsTotal) * 100, '']);
  return rows.map((row) => row.join('\t')).join('\n');
}

async function generateSprintReport(sprintName) {
  const issues = await getIssuesForSprint(sprintName);
  return generateSprintReportFromIssues(issues);
}

async function generatePointsSummary(sprintName) {
  const issues = await getIssuesForSprint(sprintName);
  const pointsDone = sum(
    issues.filter((issue) => DONE_STATUSES.includes(issue.status)).map((issue) => issue.points)
  );
  const pointsTotal = sum(issues.map((issue) => issue.points));
  return `Goal Completion: ${(pointsDone / pointsTotal) * 100}% (${pointsDone} points out of ${pointsTotal})`;
}
