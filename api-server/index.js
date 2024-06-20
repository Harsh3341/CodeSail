require("dotenv").config();
const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { z } = require("zod");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");
const { createClient } = require("@clickhouse/client");
const { Kafka } = require("kafkajs");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 9000;

app.use(express.json());
app.use(cors());

const prisma = new PrismaClient();

const client = createClient({
  host: process.env.CLICKHOUSE_HOST,
  database: "default",
  username: process.env.CLICKHOUSE_USERNAME,
  password: process.env.CLICKHOUSE_PASSWORD,
});

const kafka = new Kafka({
  clientId: `api-server`,
  brokers: ["kafka-3b175ff8-freethecookies-a3be.k.aivencloud.com:21682"],
  sasl: {
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
    mechanism: "plain",
  },
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, "kafka.pem"), "utf-8")],
  },
});

const consumer = kafka.consumer({ groupId: "api-server-logs-consumer" });

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

app.post("/project", async (req, res) => {
  const schema = z.object({
    name: z.string(),
    githubUrl: z.string(),
  });

  const safeParse = schema.safeParse(req.body);

  if (safeParse.error) return res.status(400).json({ error: safeParse.error });

  const { name, githubUrl } = safeParse.data;

  const project = await prisma.project.create({
    data: {
      name,
      githubUrl,
      subDomain: generateSlug(),
    },
  });

  return res.json({ status: "success", data: { project } });
});

app.post("/deploy", async (req, res) => {
  const { projectId } = req.body;

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) return res.status(404).json({ error: "Project not found" });

  const deployment = await prisma.deployment.create({
    data: {
      project: {
        connect: {
          id: projectId,
        },
      },
      status: "QUEUED",
    },
  });

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
              name: "REGION",
              value: process.env.REGION,
            },
            {
              name: "AccessKeyId",
              value: process.env.AccessKeyId,
            },
            {
              name: "SecretAccessKey",
              value: process.env.SecretAccessKey,
            },
            {
              name: "GIT_REPOSITORY_URL",
              value: project.githubUrl,
            },
            {
              name: "PROJECT_ID",
              value: projectId,
            },
            {
              name: "DEPLOYMENT_ID",
              value: deployment.id,
            },
            {
              name: "KAFKA_USERNAME",
              value: process.env.KAFKA_USERNAME,
            },
            {
              name: "KAFKA_PASSWORD",
              value: process.env.KAFKA_PASSWORD,
            },
            {
              name: "BUCKET_NAME",
              value: process.env.BUCKET_NAME,
            },
          ],
        },
      ],
    },
  });

  await ecs.send(command);

  return res.json({
    status: "queued",
    data: { deploymentId: deployment.id },
  });
});

app.get("/logs/:id", async (req, res) => {
  const id = req.params.id;
  const logs = await client.query({
    query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id = {deployment_id:String}`,
    query_params: {
      deployment_id: id,
    },
    format: "JSONEachRow",
  });

  const rawLogs = await logs.json();

  return res.json({ logs: rawLogs });
});

const initKafkaConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "container-logs" });

  await consumer.run({
    autoCommit: false,
    eachBatch: async ({
      batch,
      heartbeat,
      commitOffsetsIfNecessary,
      resolveOffset,
    }) => {
      const messages = batch.messages;
      console.log(`Received messages: ${messages.length}`);

      for (const message of messages) {
        const stringMessage = message.value.toString();
        const { PROJECT_ID, DEPLOYMENT_ID, log } = JSON.parse(stringMessage);

        try {
          const { query_id } = await client.insert({
            table: "log_events",
            values: [
              {
                event_id: uuidv4(),
                deployment_id: DEPLOYMENT_ID,
                log,
              },
            ],
            format: "JSONEachRow",
          });

          console.log(`Inserted log with query_id: ${query_id}`);

          commitOffsetsIfNecessary(message.offset);
          resolveOffset(message.offset);
          await heartbeat();
        } catch (error) {
          console.error("Error inserting log", error);
        }
      }
    },
  });
};

initKafkaConsumer();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
