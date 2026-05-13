const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const sns = new SNSClient({ region: process.env.AWS_REGION });

// Called right after a task is created so the assignee gets an email notification
// and the SQS worker Lambda can log the assignment event
async function publishTaskAssignment({
  taskId,
  taskTitle,
  assigneeId,
  assigneeName,
  teamId,
}) {
  const message = JSON.stringify({
    taskId,
    taskTitle,
    assigneeId,
    assigneeName,
    teamId,
  });

  await sns.send(
    new PublishCommand({
      TopicArn: process.env.TASK_ASSIGNMENT_TOPIC_ARN,
      Message: message,
      Subject: `New task assigned to you: ${taskTitle}`,
    })
  );
}

module.exports = { publishTaskAssignment };
