import { Parser } from "./parser";
import { FileReader } from "./reader";
import { Tokenizer } from "./tokenizer";
import { ConsoleWriter } from "./writer";

async function main() {
    const reader = new FileReader(process.argv[2]);
    await reader.init();
    const tokenizer = new Tokenizer(reader);
    const parser = new Parser(tokenizer);
    const writer = new ConsoleWriter();
    const mode = process.argv[3] ?? 'program';
    const result = await parser.parse(mode);
    if (result.ok) {
        if (mode === 'expr') {
            writer.writeInvPolish(result);
        } else {
            writer.writeNode(result);
        }
    } else {
        writer.writeResult(result);
    }
}

main();