# Mini Jira AWS

Mini Jira is a cloud-hosted task and project management application inspired by Jira. It supports team-based task visibility, role-based workflows for employees and managers, project/task CRUD operations, comments, image uploads, notifications, and a Kanban board for tracking work across statuses.

The application is built with a React/Vite frontend, an Express.js backend, Amazon Cognito authentication, DynamoDB persistence, S3 image storage, Lambda-based automation, and event-driven notification flows using SNS, SQS, and EventBridge.

## Live Application

- CloudFront URL: `https://digbiwcb86fsu.cloudfront.net`
- ALB URL: `http://mini-jira-alb-789371030.eu-north-1.elb.amazonaws.com`
- AWS Region: `eu-north-1`


## Team Members and Roles

| Member | Responsibility |
| --- | --- |
| Jana Hendy | Frontend Authentication and Layout: login, register, Cognito frontend integration, routing, protected routes, main layout/sidebar/navbar, loading and error states. |
| Abdelrahman Moussa | Frontend Tasks and Kanban Board: Kanban board, task cards, drag-and-drop status updates, task detail modal, comments UI, image display, employee dashboard. |
| Habiba Mahmoud | Manager Frontend, Projects, and Admin UI: manager dashboard, create project/task forms, assign tasks, team filtering, project CRUD UI, team/user management UI. |
| Rawda Tarek | Backend Core API and Security: Express backend, Cognito token verification, role-based middleware, team-based authorization, task/project/comment CRUD, audit logs. |
| Karma Kandil | AWS Data and Event-Driven Services: DynamoDB tables and GSIs, S3 buckets, image upload backend logic, image resize Lambda, SNS topic, SQS queue, assignment worker Lambda, EventBridge daily digest Lambda. |
| Jomana Shady | Deployment, Monitoring, and Documentation: EC2 setup, Auto Scaling Group, Application Load Balancer, CloudFront distribution, VPC/subnets/security groups, IAM roles, CloudWatch dashboard and alarm, architecture diagram, README, demo video, submission form. |

## Architecture Diagram

The final submission must include a detailed AWS architecture diagram using AWS standard icons.

![Mini Jira AWS Architecture Diagram](docs/architecture-diagram/mini-jira-architecture-final.png)

## AWS Services Used

| Service | Usage |
| --- | --- |
| Amazon EC2 | Runs the deployed backend application servers. |
| Auto Scaling Group | Maintains backend availability and scales EC2 instances across two Availability Zones. |
| Application Load Balancer | Distributes incoming API traffic across healthy EC2 instances. |
| Amazon CloudFront | Provides the public frontend entry point and improves delivery through edge caching. |
| Amazon DynamoDB | Stores users, teams, projects, tasks, comments, and activity logs. |
| Amazon S3 | Stores original uploaded task images and resized image outputs. |
| AWS Lambda | Runs background functions for image resizing, assignment processing, and daily digest generation. |
| Amazon SNS | Publishes task assignment notification events. |
| Amazon SQS | Buffers assignment events for asynchronous worker processing. |
| Amazon EventBridge | Triggers scheduled daily digest processing. |
| Amazon CloudWatch | Collects logs, powers the monitoring dashboard, and triggers alarms. |
| Amazon Cognito | Handles user authentication and user pool identity management. |
| AWS IAM | Provides least-privilege permissions for EC2, Lambda, DynamoDB, S3, SNS, SQS, and CloudWatch access. |
| Amazon VPC | Hosts the load balancer and EC2 resources inside configured subnets and security groups. |

## Features Implemented

- Authentication using Amazon Cognito.
- Role-based access for employees, managers, and admin-style flows.
- Team isolation so employees can only access tasks allowed for their team.
- Project, task, and comment CRUD APIs.
- Manager dashboard for creating projects, assigning tasks, and filtering by team.
- Employee dashboard with a Kanban board.
- Drag-and-drop task status updates.
- Task detail modal with comments and uploaded image display.
- Image upload through the backend to S3.
- Lambda image resize workflow for uploaded images.
- SNS/SQS-based task assignment notification flow.
- Assignment worker Lambda that processes queued events and writes activity logs.
- EventBridge daily digest Lambda workflow.
- CloudWatch dashboard for operational monitoring.
- CloudWatch alarm for production visibility.

## Application Architecture

1. Users access the application through the CloudFront distribution.
2. The frontend authenticates users with Amazon Cognito and receives JWT tokens.
3. Frontend API requests include the Cognito token and are sent to the backend through the Application Load Balancer.
4. EC2 instances running the Express backend verify Cognito tokens, enforce role-based access, and enforce team-based authorization.
5. Backend APIs read and write application data in DynamoDB.
6. Uploaded task images are stored in S3.
7. S3 upload events trigger the image resize Lambda, which writes resized images to the resized-image bucket.
8. Task assignment events are published to SNS and delivered to SQS.
9. The assignment worker Lambda consumes SQS messages and records activity logs.
10. EventBridge triggers the daily digest Lambda on a schedule.
11. CloudWatch collects logs, dashboard metrics, and alarm state.

## How to Run Locally

### Prerequisites

- Node.js and npm.
- AWS credentials configured locally with access to DynamoDB, S3, SNS, and SQS for the selected region.
- Cognito User Pool ID and App Client ID.

### Backend

1. Configure `backend/.env` by copying `backend/.env.example` and filling in the real AWS/Cognito values.

   ```bash
   cd backend
   npm install
   npm start
   ```

2. The backend starts on the port configured in `backend/.env`, currently `5001` in the example file.

If the dashboard shows `Failed to load data` with HTTP 500 errors, the backend usually cannot reach DynamoDB. Run `npm run db:create` in `backend`, confirm AWS credentials are configured, and confirm table names in `.env` match the deployed DynamoDB tables.

### Frontend

1. Create `frontend/.env` with the frontend configuration values.

   ```env
   VITE_AWS_REGION=eu-north-1
   VITE_COGNITO_USER_POOL_ID=your-user-pool-id
   VITE_COGNITO_CLIENT_ID=your-user-pool-client-id
   VITE_API_BASE_URL=http://localhost:5001
   ```

2. Install dependencies and start Vite.

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open the Vite local URL shown in the terminal, usually `http://localhost:5173`.

## Repository Structure

```text
backend/                 Express API, middleware, routes, services, and DynamoDB setup script
frontend/                React/Vite frontend application
lambdas/image-resize/    Lambda for resizing uploaded images
lambdas/assignment-worker/ Lambda for processing assignment queue messages
lambdas/daily-digest/    Lambda for scheduled daily digest processing
```

## Deployment Notes

- The backend should run on EC2 instances inside an Auto Scaling Group across two Availability Zones.
- The Application Load Balancer should forward API traffic to healthy EC2 instances.
- CloudFront should be the public application URL.
- Security groups should allow only the required inbound traffic.
- IAM roles should grant only the permissions required by each compute service.
- CloudWatch logs, dashboard widgets, and alarms should be configured before the demo.

## Screenshots and Deployment Evidence

A complete collection of application screenshots, AWS deployment screenshots,
CloudWatch dashboards, alarms, Lambda configurations, networking setup,
and testing evidence is available in the PDF below.

[View Screenshots PDF](docs/screenshots/cloud-project-screenshots.pdf)

## Demo Video

Watch the full project demonstration here:

[Mini Jira AWS Demo Video](https://drive.google.com/file/d/1TUNyd__Beg0fIO7U4gMMYiDcaZXgPRga/view?usp=sharing)

