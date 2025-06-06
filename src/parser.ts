import DEFAULT_PARSER_RULES, { IParseResult, IParserRules } from "./parser-rules";
import { ITokenizer } from "./tokenizer";

export interface IParser<TRules extends IParserRules> {
    parse(rule: keyof TRules): Promise<IParseResult>;
}

export class Parser<TRules extends IParserRules = typeof DEFAULT_PARSER_RULES> implements IParser<TRules> {
    constructor(tokenizer: ITokenizer, debug?: boolean, rules?: TRules) {
        this.tokenizer = tokenizer;
        const rulesOrDefault = rules ?? <TRules>DEFAULT_PARSER_RULES;
        this.rules = <TRules>{};

        let depth = 0;

        for(const rule in rulesOrDefault) {
            this.rules[rule] = <any>{
                async applyRule(tokenizer, rules: TRules): Promise<IParseResult> {
                    if (debug) {
                        console.log(depth, 'applying rule', rule);
                    }
                    depth++;
                    const ret = await rulesOrDefault[rule].applyRule(tokenizer, rules);
                    depth--;
                    if (debug) {
                        console.log(depth, 'applied rule', rule, 'result', JSON.stringify(ret));
                    }
                    return ret;
                },
            }
        }
    }
    async parse(rule: keyof TRules): Promise<IParseResult> {
        return this.rules[rule].applyRule(this.tokenizer, this.rules);
    }

    private tokenizer: ITokenizer;
    private rules: TRules;
}
