
import { Command } from "@commander-js/extra-typings";
import { serveDirectory, type ServeOptions } from "./server";
import { exportToPdf } from "./to-pdf";
import { exportSite } from "./export-site";
import path from "path";


const pdfCommand = new Command()
  .name("to-pdf")
  .description("exports a file to pdf")
  .requiredOption("-i, --input <file>", "The input file (.md)")
  .requiredOption("-o, --output <file>", "The output file (.pdf)")
  .action(async ({ input, output }) => {
    await exportToPdf(input, output);
  })

const exportCommand = new Command()
  .name("export")
  .description("exports a directory of markdown files into a static website")
  .requiredOption("-i, --input <file>", "The input directory")
  .requiredOption("-o, --output <file>", "The output directory")
  .action(async ({ input, output }) => {
    const absoluteInput = path.resolve(input);
    const absoluteOutput = path.resolve(output);

    if (absoluteOutput.startsWith(absoluteInput + path.sep) || absoluteOutput === absoluteInput) {
      console.error("Error: output directory must not be inside the input directory");
      process.exit(1);
    }

    await exportSite(absoluteInput, absoluteOutput);
  })

const serveCommand = new Command()
  .name("serve")
  .description("Serve a directory of markdown files for easy viewing")
  .requiredOption("-d, --directory <dir>", "The directory to serve")
  .option("--only-markdown", "Whether to only serve markdown files")
  .option("-p, --port <port>", "The port to serve on", "4242")
  .option("-w, --watch", "Whether to watch the directory for changes or not")
  .action((opts) => {
    const options: ServeOptions = {
      directory: opts.directory,
      port: parseInt(opts.port),
      watchForUpdates: opts.watch ?? false,
    }

    serveDirectory(options);
  })

const program = new Command()
  .name("noteview")
  .description("Render your markdown files beautifully and elegantly")

program.addCommand(pdfCommand);
program.addCommand(serveCommand);
program.addCommand(exportCommand);

program.parse(process.argv);
