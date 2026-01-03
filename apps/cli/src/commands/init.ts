import { generateProjectId } from "@proof-of-build/core";
import { Command } from "commander";

export function initCommand(): Command {
	const command = new Command("init");

	command
		.description("Initialize a new project and generate a project ID")
		.option("-n, --name <name>", "Project name (optional)")
		.action((options) => {
			const projectId = generateProjectId();
			console.log(`\n✅ Project initialized!`);
			console.log(`\nProject ID: ${projectId}`);
			if (options.name) {
				console.log(`Project name: ${options.name}`);
			}
			console.log(`\n📋 Next steps:`);
			console.log(`1. Prepare your artifacts:`);
			console.log(
				`   - Screenshots: Put PNG/JPG files in a directory (e.g., ./screenshots)`,
			);
			console.log(
				`   - Terminal output: Put .txt files in a directory (e.g., ./terminal)`,
			);
			console.log(`   - Logs: Put .log files in a directory (e.g., ./logs)`);
			console.log(`\n2. Upload artifacts:`);
			console.log(
				`   proof-of-build upload --project ${projectId} --frames ./screenshots --terminal ./terminal --logs ./logs`,
			);
			console.log(`\n3. Generate manifest (after uploads complete):`);
			console.log(`   proof-of-build manifest --project ${projectId}`);
			console.log(
				`\n💡 Note: Replace ./screenshots, ./terminal, ./logs with your actual directory paths`,
			);
		});

	return command;
}
