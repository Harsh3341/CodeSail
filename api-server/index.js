require("dotenv").config();
const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");

const app = express();
const PORT = 9000;

app.use(express.json());

const ecs = new ECSClient({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.AccessKeyId,
    secretAccessKey: process.env.SecretAccessKey,
  },
});

const config = {
  CLUSTER: process.env.CLUSTER,
  TASK_DEFINITION: process.env.TASK_DEFINITION,
};

app.post("/deploy", async (req, res) => {
  const { githubURL } = req.body;
  const slug = generateSlug();

  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK_DEFINITION,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: [
          "subnet-019512158bb51ddfd",
          "subnet-074792da4d683d02b",
          "subnet-01635fbf9f80ca347",
        ],
        securityGroups: ["sg-0210ec9b7f0613e3e"],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image",
          environment: [
            {
              name: "GIT_REPOSITORY_URL",
              value: githubURL,
            },
            {
              name: "PROJECT_ID",
              value: slug,
            },
          ],
        },
      ],
    },
  });

  await ecs.send(command);

  return res.json({
    status: "queued",
    data: { slug, url: `http://${slug}.localhost:8000` },
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
