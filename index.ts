import Client from "ssh2-sftp-client";
import { PhotoProcessor } from "./processor.js";
import { Logger } from "./logger.js";

let sftp = new Client();

await sftp.connect({
  host: "192.168.1.18",
  port: "2222",
  username: "slawa",
  password: "francis",
  timeout: 5_000,
});

const logger = new Logger("photo-processor");
const processor = new PhotoProcessor(
  sftp,
  logger,
  "/DCIM/Camera",
  "O:\\new\\2024\\slawa-nord\\",
);
await processor.organizeFilesByMonth();
await processor.copyAllFoldersToDiskstation();
await sftp.end();
