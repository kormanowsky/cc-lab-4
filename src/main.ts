import { Parser } from "./parser";
import { FileReader } from "./reader";
import { Tokenizer } from "./tokenizer";
import { ConsoleWriter } from "./writer";

async function main() {
    const reader = new FileReader(process.argv[2]);
    const tokenizer = new Tokenizer(reader);
    const parser = new Parser(tokenizer);
    const writer = new ConsoleWriter();
    const result = await parser.parse('program');
    writer.writeResult(result);
}

main();