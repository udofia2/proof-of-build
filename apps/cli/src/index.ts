#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { manifestCommand } from "./commands/manifest.js";
import { uploadCommand } from "./commands/upload.js";

const program = new Command();

program
	.name("proof-of-build")
	.description("CLI tool for uploading artifacts to Proof-of-Build")
	.version("0.1.0");

program.addCommand(initCommand());
program.addCommand(uploadCommand());
program.addCommand(manifestCommand());

program.parse();
