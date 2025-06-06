import { ITokenizer } from "./tokenizer";

export interface IParseResult {
    ok: boolean;
    error?: string;
}

export interface IParserRule {
    applyRule(tokenizer: ITokenizer, rules: IParserRules): Promise<IParseResult>;
}

export type IParserRules = Record<string, IParserRule>;

const DEFAULT_PARSER_RULES: IParserRules = {
    program: {
        async applyRule(tokenizer, rules) {
            const firstToken = await tokenizer.getNextToken();

            if (firstToken.content !== 'begin') {
                return {ok: false, error: `program: expected \`begin\`, found \`${firstToken.content}\``};
            }

            const operatorsResult = await rules.operators.applyRule(tokenizer, rules);

            if (!operatorsResult.ok) {
                return operatorsResult;
            }

            const lastToken = await tokenizer.getNextToken();

            if (lastToken.content !== 'end') {
                return {ok: false, error: `program: expected \`end\`, found \`${lastToken.content}\``};
            }

            return {ok: true};
        }
    },
    operators: {
        async applyRule(tokenizer, rules) {
            const operatorResult = await rules.operator.applyRule(tokenizer, rules);

            if (!operatorResult.ok) {
                return operatorResult;
            }

            const tokenizerCopy = tokenizer.copy();

            const nextToken = await tokenizerCopy.getNextToken();

            if (nextToken.content !== ';') {
                return operatorResult;
            }

            const moreOperatorsResult = await rules.moreOperators.applyRule(tokenizerCopy, rules);

            if (moreOperatorsResult.ok) {
                tokenizer.assign(tokenizerCopy);
            }

            return moreOperatorsResult;
        },
    },
    moreOperators: {
        async applyRule(tokenizer, rules) {
            const operatorResult = await rules.operator.applyRule(tokenizer, rules);

            if (!operatorResult.ok) {
                return operatorResult;
            }

            const tokenizerCopy = tokenizer.copy();

            const nextToken = await tokenizerCopy.getNextToken();

            if (nextToken.content !== ';') {
                return operatorResult;
            }

            const moreOperatorsResult = await rules.moreOperators.applyRule(tokenizerCopy, rules);

            if (moreOperatorsResult.ok) {
                tokenizer.assign(tokenizerCopy);
            }

            return moreOperatorsResult;
        },
    },
    operator: {
        async applyRule(tokenizer, rules) {
            const idResult = await rules.id.applyRule(tokenizer, rules);

            if (!idResult.ok) {
                return idResult;
            }

            const nextToken = await tokenizer.getNextToken();

            if (nextToken.content !== '=') {
                return {ok: false, error: `operator: expected \`=\`, found \`${nextToken.content}\``};
            }

            return rules.expr.applyRule(tokenizer, rules);
        },
    },

    expr: {
        async applyRule(tokenizer, rules) {
            let prExprResult = await rules.prExpr.applyRule(tokenizer, rules);

            if (!prExprResult.ok) {
                return prExprResult;
            }

            const tokenizerCopy = tokenizer.copy();

            const relOpResult = await rules.relOp.applyRule(tokenizerCopy, rules);

            if (!relOpResult.ok) {
                return prExprResult;
            }

            prExprResult = await rules.prExpr.applyRule(tokenizerCopy, rules);

            if (prExprResult.ok) {
                tokenizer.assign(tokenizerCopy);
            }

            return prExprResult;
        }
    },

    prExpr: {
        async applyRule(tokenizer, rules) {
            let tokenizerCopy = tokenizer.copy();

            const termResult = await rules.term.applyRule(tokenizerCopy, rules);

            if (termResult.ok) {
                const tokenizerCopy2 = tokenizerCopy.copy();

                const morePrExprResult = await rules.morePrExpr.applyRule(tokenizerCopy2, rules);

                if (morePrExprResult.ok) {
                    tokenizer.assign(tokenizerCopy2);
                    return morePrExprResult;
                }

                tokenizer.assign(tokenizerCopy);
                return termResult;
            }

            tokenizerCopy = tokenizer.copy();

            const signResult = await rules.sign.applyRule(tokenizerCopy, rules);

            if (signResult.ok) {
                const tokenizerCopy2 = tokenizerCopy.copy();

                const termResult = await rules.term.applyRule(tokenizerCopy2, rules);

                if (termResult.ok) {
                    const morePrExprResult = await rules.morePrExpr.applyRule(tokenizerCopy2, rules);

                    if (morePrExprResult.ok) {
                        tokenizer.assign(tokenizerCopy2);
                        return morePrExprResult;
                    }
                }

                tokenizer.assign(tokenizerCopy);
            }

            return signResult;
        }
    },

    morePrExpr: {
        async applyRule(tokenizer, rules) {
            const addOpResult = await rules.addOp.applyRule(tokenizer, rules);

            if (!addOpResult.ok) {
                return addOpResult;
            }

            const termResult = await rules.term.applyRule(tokenizer, rules);

            if (!termResult.ok) {
                return termResult;
            }

            const tokenizerCopy = tokenizer.copy();

            const morePrExprResult = await rules.morePrExpr.applyRule(tokenizerCopy, rules);

            if (morePrExprResult.ok) {
                tokenizer.assign(tokenizerCopy);
                return morePrExprResult;
            }

            return termResult;
        }
    },

    term: {
        async applyRule(tokenizer, rules) {
            const factorResult = await rules.factor.applyRule(tokenizer, rules);

            if (!factorResult.ok) {
                return factorResult;
            }

            const tokenizerCopy = await tokenizer.copy();

            const moreTermResult = await rules.moreTerm.applyRule(tokenizerCopy, rules);

            if (moreTermResult.ok) {
                tokenizer.assign(tokenizerCopy);
                return moreTermResult;
            }

            return factorResult;
        },
    },

    moreTerm: {
        async applyRule(tokenizer, rules) {
            const mulOpResult = await rules.mulOp.applyRule(tokenizer, rules);

            if (!mulOpResult.ok) {
                return mulOpResult;
            }

            const factorResult = await rules.factor.applyRule(tokenizer, rules);

            if (!factorResult.ok) {
                return factorResult;
            }

            const tokenizerCopy = tokenizer.copy();

            const moreTermResult = await rules.moreTerm.applyRule(tokenizerCopy, rules);

            if (moreTermResult.ok) {
                tokenizer.assign(tokenizerCopy);
                return moreTermResult;
            }

            return factorResult;
        }
    },

    factor: {
        async applyRule(tokenizer, rules) {
            let tokenizerCopy = tokenizer.copy();

            const idResult = await rules.id.applyRule(tokenizerCopy, rules);

            if (idResult.ok) {
                tokenizer.assign(tokenizerCopy);
                return idResult;
            }

            tokenizerCopy = tokenizer.copy();

            const constResult = await rules.const.applyRule(tokenizerCopy, rules);

            if (constResult.ok) {
                tokenizer.assign(tokenizerCopy);
                return constResult;
            }

            tokenizerCopy = tokenizer.copy();

            const nextToken = await tokenizerCopy.getNextToken();

            if (nextToken.content !== '(') {
                if (nextToken.content !== 'not') {
                    return {ok: false, error: `factor: expected \`(\` or \`not\`, found \`${nextToken.content}\``};
                }

                const factorResult = await rules.factor.applyRule(tokenizerCopy, rules);

                if (factorResult.ok) {
                    tokenizer.assign(tokenizerCopy);
                }

                return factorResult;
            }

            const prExprResult = await rules.expr.applyRule(tokenizerCopy, rules);

            if (!prExprResult.ok) {
                return prExprResult;
            }

            const groupCloseToken = await tokenizerCopy.getNextToken();

            if (groupCloseToken.content !== ')') {
                return {ok: false, error: `factor: expected \`)\`, found \`${groupCloseToken.content}\``};
            }

            tokenizer.assign(tokenizerCopy);
            return {ok: true};
        },
    },

    relOp: {
        async applyRule(tokenizer, rules) {
            const nextToken = await tokenizer.getNextToken();
            const expected = ['==', '!=', '<', '>', '>=', '<='];

            if (expected.includes(nextToken.content)) {
                return {ok: true};
            }

            return {
                ok: false, 
                error: `rel_op: expected one of ${expected.map(v => `\`${v}\``).join(', ')}, found \`${nextToken.content}\``
            };
        }
    },

    sign: {
        async applyRule(tokenizer, rules) {
            const nextToken = await tokenizer.getNextToken();
            const expected = ['+', '-'];

            if (expected.includes(nextToken.content)) {
                return {ok: true};
            }

            return {
                ok: false, 
                error: `sign: expected one of ${expected.map(v => `\`${v}\``).join(', ')}, found \`${nextToken.content}\``
            };
        }
    },

    addOp: {
        async applyRule(tokenizer, rules) {
            const nextToken = await tokenizer.getNextToken();
            const expected = ['+', '-', 'or'];

            if (expected.includes(nextToken.content)) {
                return {ok: true};
            }

            return {
                ok: false, 
                error: `add_op: expected one of ${expected.map(v => `\`${v}\``).join(', ')}, found \`${nextToken.content}\``
            };
        }
    },

    mulOp: {
        async applyRule(tokenizer, rules) {
            const nextToken = await tokenizer.getNextToken();
            const expected = ['*', '/', 'div', 'mod', 'and'];

            if (expected.includes(nextToken.content)) {
                return {ok: true};
            }

            return {
                ok: false, 
                error: `mul_op: expected one of ${expected.map(v => `\`${v}\``).join(', ')}, found \`${nextToken.content}\``
            };
        }
    },

    id: {
        async applyRule(tokenizer, rules) {
            const nextToken = await tokenizer.getNextToken();

            if (/[A-Z]+/.test(nextToken.content)) {
                return {ok: true};
            }

            return {ok: false, error: `id: invalid identifier: \`${nextToken.content}\`, must match ${/[A-Z]+/}`}
        }
    },

    const: {
        async applyRule(tokenizer, rules) {
            const nextToken = await tokenizer.getNextToken();

            if (/[0-9]+/.test(nextToken.content)) {
                return {ok: true};
            }

            if (['true', 'false'].includes(nextToken.content)) {
                return {ok: true};
            }

            return {ok: false, error: `const: must be \`true\`, \`false\` or an integer constant`};
        }
    }
};

export default DEFAULT_PARSER_RULES;