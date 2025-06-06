import { IReader } from "./reader";

export type ITokenType = 'id' | 'const' | 'group' | 'op' | 'delim' | 'ws';

export interface IToken {
    type: ITokenType;
    content: string;
}

export interface ITokenizer {
    getNextToken(): Promise<IToken | null>;
}

export class Tokenizer implements ITokenizer {
    constructor(reader: IReader) {
        this.reader = reader;
    }

    async getNextToken(): Promise<IToken | null> {
        let nextChar = await this.reader.getNextChar();
        let nextCharType = Object.entries(this.charTypeMap).find(([k, v]) => v.test(nextChar))?.[0];

        if (!nextChar || !nextCharType) {
            return null;
        }

        let ret: IToken | null = null;

        if (this.curToken == null) {
            this.curToken = {
                type: <ITokenType>nextCharType,
                content: ""
            };
        } else if (this.curToken.type !== nextCharType) {
            ret = this.curToken;
            this.curToken = {
                type: <ITokenType>nextCharType,
                content: nextChar
            };
        }

        if (!ret) {
            do {
                this.curToken.content = this.curToken.content + nextChar;
                nextChar = await this.reader.getNextChar();
                nextCharType = Object.entries(this.charTypeMap).find(([k, v]) => v.test(nextChar))?.[0];
            } while (nextChar && nextCharType && nextCharType === this.curToken.type);

            ret = this.curToken;

            this.curToken = {
                type: <ITokenType>nextCharType,
                content: nextChar
            };
        }

        return ret;
    }

    private reader: IReader;
    private readonly charTypeMap: Record<ITokenType, RegExp> = {
        id: /[A-Z]/,
        const: /[0-9a-z]/,
        group: /[\(\)]/,
        op: /[=!<>\+\-\*\/]/,
        delim: /;/,
        ws: /\s/,
    };
    private curToken: IToken | null = null;
}