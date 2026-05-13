// Triggered by SQS messages published from the SNS task-assignment topic.
// Each message means a task was just assigned to an employee.
// This Lambda: (1) writes an activity log entry to DynamoDB, (2) publishes a custom CloudWatch metric.
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");
const { randomUUID } = require("crypto");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cloudwatch = new CloudWatchClient({});

const ACTIVITY_LOG_TABLE = process.env.ACTIVITY_LOG_TABLE;

exports.handler = async (event) => {
  for (const record of event.Records) {
    // SQS body is a JSON string that SNS wraps in another JSON object
    let payload;
    try {
      const sqsBody = JSON.parse(record.body);
      // SNS fan-out wraps the original message inside a "Message" field
      payload = JSON.parse(sqsBody.Message);
    } catch (err) {
      console.error("Failed to parse SQS message:", record.body, err);
      continue;
    }

    const { taskId, taskTitle, assigneeId, assigneeName, teamId } = payload;

    // 1. Write an activity log entry to DynamoDB
    await dynamo.send(
      new PutCommand({
        TableName: ACTIVITY_LOG_TABLE,
        Item: {
          logId: randomUUID(),
          eventType: "TASK_ASSIGNED",
          taskId,
          teamId,
          assigneeId,
          message: `Task "${taskTitle}" was assigned to ${assigneeName}`,
          createdAt: new Date().toISOString(),
        },
      })
    );

    // 2. Publish a custom CloudWatch metric: how many tasks assigned per team
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: "MiniJira",
        MetricData: [
          {
            MetricName: "TasksAssignedPerTeam",
            Dimensions: [{ Name: "TeamId", Value: teamId || "unknown" }],
            Value: 1,
            Unit: "Count",
          },
        ],
      })
    );

    console.log(
      `Logged assignment: task=${taskId}, assignee=${assigneeName}, team=${teamId}`
    );
  }
};
