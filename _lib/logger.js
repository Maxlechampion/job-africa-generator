/**
 * Logger coloré pour les scripts générateurs.
 */

import chalk from "chalk";

const timestamp = () => new Date().toLocaleTimeString("fr-FR");

export const log = {
  info(msg) {
    console.log(chalk.blue(`[${timestamp()}] ℹ️  ${msg}`));
  },

  success(msg) {
    console.log(chalk.green(`[${timestamp()}] ✅ ${msg}`));
  },

  warn(msg) {
    console.log(chalk.yellow(`[${timestamp()}] ⚠️  ${msg}`));
  },

  error(msg) {
    console.log(chalk.red(`[${timestamp()}] ❌ ${msg}`));
  },

  debug(msg) {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`[${timestamp()}] 🐛 ${msg}`));
    }
  },

  section(title) {
    console.log("");
    console.log(chalk.bgBlue.white.bold(` ${title} `));
    console.log("");
  },

  banner(title) {
    console.log("");
    console.log(chalk.bgGreen.white.bold("═".repeat(60)));
    console.log(chalk.bgGreen.white.bold(` ${title}`.padEnd(60)));
    console.log(chalk.bgGreen.white.bold("═".repeat(60)));
    console.log("");
  },

  file(path, status) {
    const icons = {
      created: chalk.green("+"),
      overwritten: chalk.yellow("~"),
      skipped: chalk.gray("·"),
      removed: chalk.red("-"),
    };
    console.log(`  ${icons[status] || " "} ${path}`);
  },
};