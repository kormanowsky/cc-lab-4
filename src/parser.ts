import { IReader } from "./reader";
import { ITokenizer } from "./tokenizer";

export interface IParseResult {
    ok: boolean;
    error?: string;
}

export interface IParser {
    parse(): Promise<IParseResult>;
}

export class Parser implements IParser {
    constructor(tokenizer: ITokenizer) {
        this.tokenizer = tokenizer;
    }
    async parse(): Promise<IParseResult> {
        let token;
        do {
            token = await this.tokenizer.getNextToken();
            console.log(token);
        } while(token);

        return {ok: true};
    }

    private tokenizer: ITokenizer;
}
