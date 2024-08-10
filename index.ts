import {PhotoProcessor} from "./processor.js";
import {Logger} from "./logger.js";
import {connectToPhone} from "./config.js";
import {PhotoOrganizer} from "./organizer.js";

let sftp = await connectToPhone();

const logger = new Logger("photo-processor");
let DCIM_CAMERA = "/DCIM/Camera";
let destinationPath = "/Users/depidsvy/Pictures/slawa-oneplus-nord";
const organizer = new PhotoOrganizer(
	sftp,
	logger,
	DCIM_CAMERA,
);
await organizer.organizeFilesByMonth();

const processor = new PhotoProcessor(
	sftp,
	logger,
	DCIM_CAMERA,
	destinationPath,
);
await processor.copyAllFoldersToDiskstation();
await sftp.end();
