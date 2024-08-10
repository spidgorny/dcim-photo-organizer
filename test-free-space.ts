import {connectToPhone} from "./config.js";
import {Logger} from "./logger.js";

let sftp = await connectToPhone();
const logger = new Logger("test-free-space");
logger.log('Stat...');
const stat = await sftp.stat('/DCIM')
logger.log(stat);
await sftp.end();
