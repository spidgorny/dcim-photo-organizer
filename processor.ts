import sftp from "ssh2-sftp-client";
import * as fs from "node:fs";
import path from "node:path";
import { Logger } from "./logger.js";

export interface MyFileInfo extends sftp.FileInfo {
  moveTo?: string;
  destination?: string;
  exists?: boolean;
}

export class PhotoProcessor {
  constructor(
    protected sftp: sftp,
    protected logger: Logger,
    protected sourcePath: string,
    protected destinationPath: string,
  ) {}

  async copyAllFoldersToDiskstation() {
    let filesAndFolders = await this.sftp.list(this.sourcePath);
    let folders = filesAndFolders.filter((x) => x.type === "d");
    // copy only folders for the current year
    folders = folders.filter((x) =>
      x.name.startsWith(new Date().getFullYear().toString()),
    );
    this.logger.table(folders, ["name", "type", "size"]);
    for (const folder of folders) {
      this.logger.log("== Starting ", folder);
      let destinationSubfolder = path.join(this.destinationPath, folder.name);
      fs.mkdirSync(destinationSubfolder, { recursive: true });
      await this.copyFolderToDiskstation(folder.name);
    }
  }

  async copyFolderToDiskstation(folder: string) {
    let filesAndFolders = (await this.sftp.list(
      this.sourcePath + "/" + folder,
    )) as MyFileInfo[];
    let files = filesAndFolders.filter((x) => x.type === "-");
    // only files that don't already exist in the destination
    files = files.map((x) => {
      let destination = path.join(this.destinationPath, folder, x.name);
      let exists = fs.existsSync(destination);
      if (exists) {
        let stat = fs.statSync(destination);
        exists &&= stat.size === x.size;
      }
      return {
        ...x,
        destination,
        exists,
      };
    });
    this.logger.log(
      folder,
      "exists",
      files.filter((x) => x.exists).length,
      "/",
      files.length,
    );
    const toCopy = files.filter((x) => !x.exists);

    this.logger.log(folder, "to copy", toCopy.length, "/", files.length);
    this.logger.table(toCopy, [
      "name",
      "type",
      "size",
      "exists",
      "destination",
    ]);

    for (const file of toCopy) {
      if (!file.destination) {
        continue;
      }
      const filePath = path.posix.join(this.sourcePath, folder, file.name);
      this.logger.log(filePath, "=>", file.destination);
      await this.sftp.fastGet(filePath, file.destination, {
        step: (totalTransferred: number, chunk: number, total: number) => {
          let width = 50;
          let count = (totalTransferred / total) * width;
          this.logger.replace(
            filePath,
            ((totalTransferred / total) * 100).toFixed(3),
            "%",
            "[" + "=".repeat(count) + ".".repeat(width - count) + "]",
            file.size / 1024 / 1024,
            "MB",
          );
        },
      });
      console.log();
    }
  }
}
