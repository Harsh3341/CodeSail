const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");

const s3 = new S3Client({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.AccessKeyId,
    secretAccessKey: process.env.SecretAccessKey,
  },
});

const PROJECT_ID = process.env.PROJECT_ID;

const init = async () => {
  console.log("Executing script.js");

  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  p.stdout.on("error", (data) => {
    console.log("Error", data.toString());
  });

  p.on("close", async () => {
    console.log("Build Complete");

    const distFolderPath = path.join(__dirname, "output", "dist");

    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);

      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("Uploading", filePath);

      const command = new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `__output/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3.send(command);
      console.log("Uploaded", filePath);
    }

    console.log("Done...");
  });
};

init();
