// Triggered by an EventBridge scheduled rule at 9:00 AM UTC every day.
// Scans the Tasks table for tasks whose deadline is today and status is not Done,
// then sends each unique assignee a digest email via SNS.
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

const TASKS_TABLE = process.env.TASKS_TABLE;
const DIGEST_TOPIC_ARN = process.env.DIGEST_TOPIC_ARN;

exports.handler = async () => {
  // Get today's date in YYYY-MM-DD format (UTC)
  const today = new Date().toISOString().split("T")[0];
  console.log(`Running daily digest for date: ${today}`);

  // Scan all tasks — DynamoDB has no range query on deadline without a GSI,
  // so we do a full scan and filter in-memory (table is small for this project)
  const result = await dynamo.send(
    new ScanCommand({ TableName: TASKS_TABLE })
  );

  const allTasks = result.Items || [];

  // Keep only tasks due today that are not yet done
  const dueTasks = allTasks.filter(
    (task) =>
      task.deadline &&
      task.deadline.startsWith(today) &&
      task.status !== "Done"
  );

  if (dueTasks.length === 0) {
    console.log("No tasks due today. Nothing to send.");
    return;
  }

  // Group tasks by assigneeId so each person gets one combined email
  const byAssignee = {};
  for (const task of dueTasks) {
    if (!byAssignee[task.assigneeId]) {
      byAssignee[task.assigneeId] = {
        assigneeName: task.assigneeName || task.assigneeId,
        tasks: [],
      };
    }
    byAssignee[task.assigneeId].tasks.push(task);
  }

  // Publish one digest message per assignee
  for (const [assigneeId, { assigneeName, tasks }] of Object.entries(byAssignee)) {
    const taskLines = tasks
      .map((t) => `  • [${t.priority}] ${t.title} (status: ${t.status})`)
      .join("\n");

    const message = [
      `Hi ${assigneeName},`,
      ``,
      `You have ${tasks.length} task(s) due today (${today}):`,
      ``,
      taskLines,
      ``,
      `Please make sure to complete or update them before end of day.`,
      ``,
      `— Mini-Jira`,
    ].join("\n");

    await sns.send(
      new PublishCommand({
        TopicArn: DIGEST_TOPIC_ARN,
        Message: message,
        Subject: `[Mini-Jira] Daily digest — ${tasks.length} task(s) due today`,
        MessageAttributes: {
          assigneeId: {
            DataType: "String",
            StringValue: assigneeId,
          },
        },
      })
    );

    console.log(
      `Sent digest to assignee ${assigneeId} (${tasks.length} tasks)`
    );
  }

  console.log(
    `Digest complete. Notified ${Object.keys(byAssignee).length} assignee(s).`
  );
};
