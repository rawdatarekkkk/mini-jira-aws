const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

const tables = {
  users: process.env.USERS_TABLE,
  teams: process.env.TEAMS_TABLE,
  projects: process.env.PROJECTS_TABLE,
  tasks: process.env.TASKS_TABLE,
  comments: process.env.COMMENTS_TABLE,
  activityLog: process.env.ACTIVITY_LOG_TABLE,
};

const indexes = {
  tasksTeam: process.env.TASKS_TEAM_INDEX,
  tasksAssignee: process.env.TASKS_ASSIGNEE_INDEX,
  commentsTask: process.env.COMMENTS_TASK_INDEX,
};

async function getItem(tableName, key) {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    })
  );

  return result.Item || null;
}

async function putItem(tableName, item) {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return item;
}

async function updateItem(tableName, key, updates) {
  const expressionNames = {};
  const expressionValues = {};
  const assignments = [];

  Object.entries(updates).forEach(([field, value], index) => {
    const nameKey = `#field${index}`;
    const valueKey = `:value${index}`;
    expressionNames[nameKey] = field;
    expressionValues[valueKey] = value;
    assignments.push(`${nameKey} = ${valueKey}`);
  });

  const result = await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: `SET ${assignments.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes;
}

async function deleteItem(tableName, key) {
  await client.send(
    new DeleteCommand({
      TableName: tableName,
      Key: key,
    })
  );
}

async function scanTable(tableName) {
  const items = [];
  let lastEvaluatedKey;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function scanTableWithFilter(tableName, filterExpression, values, names = {}) {
  const items = [];
  let lastEvaluatedKey;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: values,
        ExpressionAttributeNames:
          Object.keys(names).length > 0 ? names : undefined,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function queryByIndex(tableName, indexName, keyName, keyValue) {
  const items = [];
  let lastEvaluatedKey;

  do {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: "#key = :value",
        ExpressionAttributeNames: {
          "#key": keyName,
        },
        ExpressionAttributeValues: {
          ":value": keyValue,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function getUserById(userId) {
  return getItem(tables.users, { userId });
}

async function listUsers() {
  return scanTable(tables.users);
}

async function listUsersByTeam(teamId) {
  return scanTableWithFilter(
    tables.users,
    "#teamId = :teamId",
    { ":teamId": teamId },
    { "#teamId": "teamId" }
  );
}

async function getProjectById(projectId) {
  return getItem(tables.projects, { projectId });
}

async function listProjects() {
  return scanTable(tables.projects);
}

async function createProject(project) {
  return putItem(tables.projects, project);
}

async function updateProject(projectId, updates) {
  return updateItem(tables.projects, { projectId }, updates);
}

async function deleteProject(projectId) {
  return deleteItem(tables.projects, { projectId });
}

async function getTaskById(taskId) {
  return getItem(tables.tasks, { taskId });
}

async function listTasksForTeam(teamId) {
  return queryByIndex(tables.tasks, indexes.tasksTeam, "teamId", teamId);
}

async function listTasksForAssignee(assigneeId) {
  return queryByIndex(
    tables.tasks,
    indexes.tasksAssignee,
    "assigneeId",
    assigneeId
  );
}

async function listAllTasks() {
  return scanTable(tables.tasks);
}

async function createTask(task) {
  return putItem(tables.tasks, task);
}

async function updateTask(taskId, updates) {
  return updateItem(tables.tasks, { taskId }, updates);
}

async function deleteTask(taskId) {
  return deleteItem(tables.tasks, { taskId });
}

async function listCommentsForTask(taskId) {
  return queryByIndex(tables.comments, indexes.commentsTask, "taskId", taskId);
}

async function createComment(comment) {
  return putItem(tables.comments, comment);
}

async function createActivityLog(entry) {
  return putItem(tables.activityLog, entry);
}

async function listActivityLogsForTask(taskId) {
  return scanTableWithFilter(
    tables.activityLog,
    "#taskId = :taskId",
    { ":taskId": taskId },
    { "#taskId": "taskId" }
  );
}

module.exports = {
  getUserById,
  listUsers,
  listUsersByTeam,
  getProjectById,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  getTaskById,
  listTasksForTeam,
  listTasksForAssignee,
  listAllTasks,
  createTask,
  updateTask,
  deleteTask,
  listCommentsForTask,
  createComment,
  createActivityLog,
  listActivityLogsForTask,
};
