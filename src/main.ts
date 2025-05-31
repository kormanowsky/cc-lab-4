import { Parser } from "./parser";
import { FileReader } from "./reader";
import { ConsoleWriter } from "./writer";

async function main() {
    const reader = new FileReader(process.argv[2]);
    const parser = new Parser();
    const writer = new ConsoleWriter();
    const result = await parser.parse(reader);
    writer.writeResult(result);
}

main();