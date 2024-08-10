import sftp from "ssh2-sftp-client";
import * as fs from "node:fs";
import path from "node:path";
import { Logger } from "./logger.js";

export interface MyFileInfo extends sftp.FileInfo {
  moveTo?: string;
  destination?: string;
  exists?: boolean;
}

export class PhotoOrganizer {
  constructor(
    protected sftp: sftp,
    protected logger: Logger,
    protected sourcePath: string,
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

}
