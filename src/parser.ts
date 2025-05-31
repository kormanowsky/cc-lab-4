import { IReader } from "./reader";

export interface IParseResult {
    ok: boolean;
    error?: string;
}

export interface IParser {
    parse(reader: IReader): Promise<IParseResult>;
}

export class Parser implements IParser {
    async parse(reader: IReader): Promise<IParseResult> {
        return {ok: false, error: 'not implemented'};
    }
}
