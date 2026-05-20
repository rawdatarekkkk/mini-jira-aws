/**
 * Creates Mini Jira DynamoDB tables and GSIs in the configured AWS account/region.
 * Safe to re-run: skips tables that already exist.
 *
 * Usage: node scripts/create-dynamodb-tables.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");

const region = process.env.AWS_REGION || "eu-north-1";
const client = new DynamoDBClient({ region });

const tableDefs = [
  {
    name: process.env.USERS_TABLE || "Users",
    key: { name: "userId", type: "S" },
  },
  {
    name: process.env.TEAMS_TABLE || "Teams",
    key: { name: "teamId", type: "S" },
  },
  {
    name: process.env.PROJECTS_TABLE || "Projects",
    key: { name: "projectId", type: "S" },
  },
  {
    name: process.env.TASKS_TABLE || "Tasks",
    key: { name: "taskId", type: "S" },
    gsis: [
      {
        name: process.env.TASKS_TEAM_INDEX || "teamId-index",
        key: { name: "teamId", type: "S" },
      },
      {
        name: process.env.TASKS_ASSIGNEE_INDEX || "assigneeId-index",
        key: { name: "assigneeId", type: "S" },
      },
    ],
  },
  {
    name: process.env.COMMENTS_TABLE || "Comments",
    key: { name: "commentId", type: "S" },
    gsis: [
      {
        name: process.env.COMMENTS_TASK_INDEX || "taskId-index",
        key: { name: "taskId", type: "S" },
      },
    ],
  },
  {
    name: process.env.ACTIVITY_LOG_TABLE || "ActivityLog",
    key: { name: "logId", type: "S" },
  },
];

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      return false;
    }
    throw err;
  }
}

function buildCreateInput(def) {
  const input = {
    TableName: def.name,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [{ AttributeName: def.key.name, AttributeType: def.key.type }],
    KeySchema: [{ AttributeName: def.key.name, KeyType: "HASH" }],
  };

  if (def.gsis?.length) {
    for (const gsi of def.gsis) {
      const exists = input.AttributeDefinitions.some(
        (a) => a.AttributeName === gsi.key.name
      );
      if (!exists) {
        input.AttributeDefinitions.push({
          AttributeName: gsi.key.name,
          AttributeType: gsi.key.type,
        });
      }
    }

    input.GlobalSecondaryIndexes = def.gsis.map((gsi) => ({
      IndexName: gsi.name,
      KeySchema: [{ AttributeName: gsi.key.name, KeyType: "HASH" }],
      Projection: { ProjectionType: "ALL" },
    }));
  }

  return input;
}

async function createTable(def) {
  if (await tableExists(def.name)) {
    console.log(`  skip  ${def.name} (already exists)`);
    return;
  }

  await client.send(new CreateTableCommand(buildCreateInput(def)));
  console.log(`  created ${def.name}`);
}

async function main() {
  console.log(`Region: ${region}`);
  console.log("Creating DynamoDB tables…");

  for (const def of tableDefs) {
    await createTable(def);
  }

  console.log("Done. Tables are ready for the backend.");
}

main().catch((err) => {
  console.error("Failed to create tables:", err.message);
  process.exit(1);
});
