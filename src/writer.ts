import { IParseResult } from "./parser-rules";

export interface IWriter {
    writeResult(result: IParseResult): Promise<void>;
}

export class ConsoleWriter implements IWriter {
    async writeResult(result: IParseResult): Promise<void> {
        console.log(result);
    }
}
