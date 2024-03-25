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

  async organizeFilesByMonth() {
    let filesAndFolders = await this.sftp.list(this.sourcePath);
    let folders = filesAndFolders.filter((x) => x.type === "d");
    this.logger.table(folders, ["name", "type", "size"]);
    let files = filesAndFolders
      .filter((x) => x.type === "-")
      .filter((x) => !x.name.startsWith("."));
    files = files.map((x) => {
      const match = /(20\d\d)(\d\d)/.exec(x.name);
      if (!match) return x;
      const moveTo = match[1] + "-" + match[2];
      return {
        ...x,
        moveTo,
      };
    });
    this.logger.table(files, ["name", "type", "size", "moveTo"]);
    await this.move(files);
  }

  async move(files: MyFileInfo[]) {
    const listDestinations = [...new Set(files.map((x) => x.moveTo))];
    this.logger.table(listDestinations);
    for (const folder of listDestinations) {
      const destination = this.sourcePath + "/" + folder;
      this.logger.log("mkdir", destination);
      await this.sftp.mkdir(destination, true);
    }
    for (const file of files) {
      if (!file.moveTo) continue;
      const source = this.sourcePath + "/" + file.name;
      const destination = this.sourcePath + "/" + file.moveTo;
      this.logger.log(source, "=>", destination);
      await this.sftp.rename(source, destination + "/" + file.name);
    }
  }

  async copyAllFoldersToDiskstation() {
    let filesAndFolders = await this.sftp.list(this.sourcePath);
    let folders = filesAndFolders.filter((x) => x.type === "d");
    folders = folders.filter((x) =>
      x.name.startsWith(new Date().getFullYear().toString()),
    );
    this.logger.table(folders, ["name", "type", "size"]);
    for (const folder of folders) {
      await this.copyFolderToDiskstation(folder.name);
    }
  }

  async copyFolderToDiskstation(folder: string) {
    let filesAndFolders = (await this.sftp.list(
      this.sourcePath + "/" + folder,
    )) as MyFileInfo[];
    let files = filesAndFolders.filter((x) => x.type === "-");
    files = files.map((x) => {
      let destination = path.join(this.destinationPath, folder, x.name);
      const exists = fs.existsSync(destination);
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
          this.logger.log(
            filePath,
            ((total / totalTransferred) * 100).toFixed(3),
            "%",
          );
        },
      });
    }
  }
}
