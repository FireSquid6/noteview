
import { Command } from "@commander-js/extra-typings";
import { serveDirectory, type ServeOptions } from "./server";



const program = new Command()
  .name("mdserve")
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

program.parse(process.argv);
