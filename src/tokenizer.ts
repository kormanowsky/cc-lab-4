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
        let nextChar = await this.reader.getNextChar();
        let nextCharType = Object.entries(this.charTypeMap).find(([k, v]) => v.test(nextChar))?.[0];

        if (!nextChar || !nextCharType) {
            return {type: 'end', content: null};
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

        if (ret.type == 'ws') {
            return this.getNextToken();
        }

        return ret;
    }

    copy(): ITokenizer {
        const tokenizer = new Tokenizer(this.reader.copy());
        tokenizer.curToken = this.curToken;
        return tokenizer;
    }

    assign(tokenizer: ITokenizer): void {
        this.reader.assign((<Tokenizer>tokenizer).reader);
        this.curToken = (<Tokenizer>tokenizer).curToken;
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
    private curToken: IToken | null = null;
}