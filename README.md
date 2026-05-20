# mini-jira-aws

## Local development

1. Configure `backend/.env` (copy from `backend/.env.example`) with Cognito and AWS settings.
2. Ensure AWS credentials can access DynamoDB in your region, then create tables:

   ```bash
   cd backend
   npm install
   npm run db:create
   ```

3. Start the API (`npm run dev`) and the frontend (`cd frontend && npm run dev`).

If the dashboard shows **Failed to load data** with HTTP 500 errors, the backend usually cannot reach DynamoDB — run `npm run db:create` in `backend` or confirm table names in `.env` match your AWS tables.