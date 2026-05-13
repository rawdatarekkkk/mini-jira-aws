const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const tasksRoutes = require("./routes/tasks.routes");
const projectsRoutes = require("./routes/projects.routes");
const usersRoutes = require("./routes/users.routes");
const teamsRoutes = require("./routes/teams.routes");
const uploadRoutes = require("./routes/upload.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Mini Jira AWS Backend is running" });
});

app.use("/api/users", usersRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/upload", uploadRoutes);

app.use(errorHandler);

module.exports = app;
