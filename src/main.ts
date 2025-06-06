import { Parser } from "./parser";
import { FileReader } from "./reader";
import { Tokenizer } from "./tokenizer";
import { ConsoleWriter } from "./writer";

async function main() {
    const reader = new FileReader(process.argv[2]);
    const tokenizer = new Tokenizer(reader);
    let token;
    do {
        token = await tokenizer.getNextToken();
        console.log(token);
    } while(token);
    /*const parser = new Parser();
    const writer = new ConsoleWriter();
    const result = await parser.parse(reader);
    writer.writeResult(result);*/
}

main();