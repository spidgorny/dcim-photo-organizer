import Client from "ssh2-sftp-client";

export async function connectToPhone() {
	let sftp = new Client();

	await sftp.connect({
		host: "192.168.8.219",
		port: "2222",
		username: "slawa",
		password: "francis",
		timeout: 5_000,
	});
	return sftp;
}