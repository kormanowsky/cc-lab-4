import { IReader } from "./reader";

export type ITokenType = 'id' | 'const' | 'group' | 'op' | 'delim' | 'ws' | 'end';

export interface IToken {
    type: ITokenType;
    content: string;
}

export interface ITokenizer {
    copy(): ITokenizer;
    assign(tokenizer: ITokenizer): void;
    getNextToken(): Promise<IToken>;
}

export class Tokenizer implements ITokenizer {
    constructor(reader: IReader) {
        this.reader = reader;
    }

    async getNextToken(): Promise<IToken> {
        if (!this.nextChar) {
            this.nextChar = await this.reader.getNextChar();
        }

        let nextCharType = Object.entries(this.charTypeMap).find(([k, v]) => v.test(this.nextChar))?.[0];

        if (!this.nextChar || !nextCharType) {
            return {type: 'end', content: null};
        }

        const token = {
            type: <ITokenType>nextCharType,
            content: ""
        };

        do {
            token.content = token.content + this.nextChar;
            this.nextChar = await this.reader.getNextChar();
            nextCharType = Object.entries(this.charTypeMap).find(([k, v]) => v.test(this.nextChar))?.[0];
        } while (this.nextChar && nextCharType && nextCharType === token.type && nextCharType !== 'group');

        if (token.type === 'ws') {
            return this.getNextToken();
        }

        return token;
    }

    copy(): ITokenizer {
        const tokenizer = new Tokenizer(this.reader.copy());
        tokenizer.nextChar = this.nextChar;
        return tokenizer;
    }

    assign(tokenizer: ITokenizer): void {
        this.reader.assign((<Tokenizer>tokenizer).reader);
        this.nextChar = (<Tokenizer>tokenizer).nextChar;
    }

    private reader: IReader;
    private readonly charTypeMap: Record<ITokenType, RegExp> = {
        id: /[A-Z]/,
        const: /[0-9a-z]/,
        group: /[\(\)]/,
        op: /[=!<>\+\-\*\/]/,
        delim: /;/,
        ws: /\s/,
        end: /./
    };
    private nextChar: string | null = null;
}