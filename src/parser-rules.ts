import { ITokenizer } from "./tokenizer";

export interface IParseNode {
    rule: string;
    content?: string;
    invPolish?: string;
    children?: IParseNode[];
}

export interface IParseResult {
    ok: boolean;
    error?: string;
    node?: IParseNode;
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

            return {
                ok: true, 
                node: {
                    rule: 'program',
                    children: [
                        {rule: 'TERMINAL', content: 'begin'}, 
                        operatorsResult.node,
                        {rule: 'TERMINAL', content: 'end'}
                    ]
                },
            };
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
                return {
                    ok: true,
                    node: {
                        rule: 'operators',
                        children: [
                            operatorResult.node
                        ]
                    },
                };
            }

            const moreOperatorsResult = await rules.moreOperators.applyRule(tokenizerCopy, rules);

            if (moreOperatorsResult.ok) {
                tokenizer.assign(tokenizerCopy);

                return {
                    ok: true,
                    node: {
                        rule: 'operators',
                        children: [
                            operatorResult.node,
                            {rule: 'TERMINAL', content: ';'},
                            moreOperatorsResult.node
                        ]
                    }
                };
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
                return {
                    ok: true,
                    node: {
                        rule: 'more_operators',
                        children: [
                            operatorResult.node
                        ]
                    }
                };
            }

            const moreOperatorsResult = await rules.moreOperators.applyRule(tokenizerCopy, rules);

            if (moreOperatorsResult.ok) {
                tokenizer.assign(tokenizerCopy);

                return {
                    ok: true,
                    node: {
                        rule: 'more_operators',
                        children: [
                            operatorResult.node,
                            {rule: 'TERMINAL', content: ';'},
                            moreOperatorsResult.node
                        ]
                    },
                };
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

            const exprResult = await rules.expr.applyRule(tokenizer, rules);

            if (!exprResult.ok) {
                return exprResult;
            }

            return {
                ok: true,
                node: {
                    rule: 'expr',
                    children: [
                        idResult.node,
                        {rule: 'TERMINAL', content: '='},
                        exprResult.node
                    ]
                },
            };
        },
    },

    expr: {
        async applyRule(tokenizer, rules) {
            const prExprResult = await rules.prExpr.applyRule(tokenizer, rules);

            if (!prExprResult.ok) {
                return prExprResult;
            }

            const tokenizerCopy = tokenizer.copy();

            const relOpResult = await rules.relOp.applyRule(tokenizerCopy, rules);

            if (!relOpResult.ok) {
                return {
                    ok: true,
                    node: {
                        rule: 'expr',
                        children: [
                            prExprResult.node
                        ],
                        invPolish: prExprResult.node.invPolish,
                    }
                };
            }

            const prExprResult2 = await rules.prExpr.applyRule(tokenizerCopy, rules);

            if (prExprResult2.ok) {
                tokenizer.assign(tokenizerCopy);

                return {
                    ok: true,
                    node: {
                        rule: 'expr',
                        children: [
                            prExprResult.node,
                            relOpResult.node,
                            prExprResult2.node
                        ],
                        invPolish: `${prExprResult.node.invPolish} ${prExprResult2.node.invPolish} ${relOpResult.node.invPolish}`
                    }
                };
            }

            return prExprResult2;
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

                    return {
                        ok: true,
                        node: {
                            rule: 'pr_expr',
                            children: [
                                termResult.node,
                                morePrExprResult.node
                            ],
                            invPolish: `${termResult.node.invPolish} ${morePrExprResult.node.invPolish}`
                        }
                    };
                }

                tokenizer.assign(tokenizerCopy);
                return {
                    ok: true,
                    node: {
                        rule: 'pr_expr',
                        children: [
                            termResult.node
                        ],
                        invPolish: termResult.node.invPolish
                    }
                };
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
                        return {
                            ok: true,
                            node: {
                                rule: 'pr_expr',
                                children: [
                                    signResult.node,
                                    termResult.node,
                                    morePrExprResult.node
                                ],
                                invPolish: `${termResult.node.invPolish} ${signResult.node.invPolish} ${morePrExprResult.node.invPolish}`
                            }
                        };
                    }

                    tokenizer.assign(tokenizerCopy2);

                    return {
                        ok: true,
                        node: {
                            rule: 'pr_expr',
                            children: [
                                signResult.node,
                                termResult.node
                            ],
                            invPolish: `${termResult.node.invPolish} ${signResult.node.invPolish}`
                        }
                    };
                }
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
                return {
                    ok: true,
                    node: {
                        rule: 'more_pr_expr',
                        children: [
                            addOpResult.node,
                            termResult.node,
                            morePrExprResult.node
                        ],
                        invPolish: `${termResult.node.invPolish} ${morePrExprResult.node.invPolish} ${addOpResult.node.invPolish}`
                    }
                };
            }

            return {
                ok: true,
                node: {
                    rule: 'more_pr_expr',
                    children: [
                        addOpResult.node,
                        termResult.node
                    ],
                    invPolish: `${termResult.node.invPolish} ${addOpResult.node.invPolish}`
                }
            };
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
                return {
                    ok: true,
                    node: {
                        rule: 'term',
                        children: [
                            factorResult.node,
                            moreTermResult.node
                        ],
                        invPolish: `${factorResult.node.invPolish} ${moreTermResult.node.invPolish}`
                    }
                };
            }

            return {
                ok: true,
                node: {
                    rule: 'term',
                    children: [
                        factorResult.node
                    ],
                    invPolish: factorResult.node.invPolish
                }
            };
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
                return {
                    ok: true,
                    node: {
                        rule: 'more_term',
                        children: [
                            mulOpResult.node,
                            factorResult.node,
                            moreTermResult.node
                        ],
                        invPolish: `${factorResult.node.invPolish} ${moreTermResult.node.invPolish} ${mulOpResult.node.invPolish}`
                    }
                };
            }

            return {
                ok: true,
                node: {
                    rule: 'more_term',
                    children: [
                        mulOpResult.node,
                        factorResult.node
                    ],
                    invPolish: `${factorResult.node.invPolish} ${mulOpResult.node.invPolish}`
                }
            };
        }
    },

    factor: {
        async applyRule(tokenizer, rules) {
            let tokenizerCopy = tokenizer.copy();

            const idResult = await rules.id.applyRule(tokenizerCopy, rules);

            if (idResult.ok) {
                tokenizer.assign(tokenizerCopy);
                return {
                    ok: true,
                    node: {
                        rule: 'factor',
                        children: [
                            idResult.node
                        ],
                        invPolish: idResult.node.invPolish
                    }
                };
            }

            tokenizerCopy = tokenizer.copy();
            const constResult = await rules.const.applyRule(tokenizerCopy, rules);

            if (constResult.ok) {
                tokenizer.assign(tokenizerCopy);
                return {
                    ok: true,
                    node: {
                        rule: 'factor',
                        children: [
                            constResult.node
                        ],
                        invPolish: constResult.node.invPolish
                    }
                };
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
                    return {
                        ok: true,
                        node: {
                            rule: 'factor',
                            children: [
                                {rule: 'TERMINAL', content: 'not'},
                                factorResult.node
                            ],
                            invPolish: `${factorResult.node.invPolish} not`
                        }
                    };
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
            return {
                ok: true,
                node: {
                    rule: 'factor',
                    children: [
                        {rule: 'TERMINAL', content: '('},
                        prExprResult.node,
                        {rule: 'TERMINAL', content: ')'},
                    ],
                    invPolish: prExprResult.node.invPolish
                }
            };
        },
    },

    relOp: {
        async applyRule(tokenizer, rules) {
            const nextToken = await tokenizer.getNextToken();
            const expected = ['==', '!=', '<', '>', '>=', '<='];

            if (expected.includes(nextToken.content)) {
                return {
                    ok: true,
                    node: {
                        rule: 'rel_op',
                        children: [
                            {rule: 'TERMINAL', content: nextToken.content, invPolish: nextToken.content}
                        ],
                        invPolish: nextToken.content
                    }
                };
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
                return {
                    ok: true,
                    node: {
                        rule: 'sign',
                        children: [
                            {rule: 'TERMINAL', content: nextToken.content, invPolish: nextToken.content}
                        ],
                        invPolish: nextToken.content
                    }
                };
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
                return {
                    ok: true,
                    node: {
                        rule: 'add_op',
                        children: [
                            {rule: 'TERMINAL', content: nextToken.content, invPolish: nextToken.content}
                        ],
                        invPolish: nextToken.content
                    }
                };
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
                return {
                    ok: true,
                    node: {
                        rule: 'mul_op',
                        children: [
                            {rule: 'TERMINAL', content: nextToken.content, invPolish: nextToken.content}
                        ],
                        invPolish: nextToken.content
                    }
                };
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
                return {
                    ok: true,
                    node: {
                        rule: 'id',
                        children: [
                            {rule: 'TERMINAL', content: nextToken.content, invPolish: nextToken.content}
                        ],
                        invPolish: nextToken.content
                    }
                };
            }

            return {ok: false, error: `id: invalid identifier: \`${nextToken.content}\`, must match ${/[A-Z]+/}`}
        }
    },

    const: {
        async applyRule(tokenizer, rules) {
            const nextToken = await tokenizer.getNextToken();

            if (/[0-9]+/.test(nextToken.content)) {
                return {
                    ok: true,
                    node: {
                        rule: 'const',
                        children: [
                            {rule: 'TERMINAL', content: nextToken.content, invPolish: nextToken.content}
                        ],
                        invPolish: nextToken.content
                    }
                };
            }

            if (['true', 'false'].includes(nextToken.content)) {
                return {
                    ok: true,
                    node: {
                        rule: 'const',
                        children: [
                            {rule: 'TERMINAL', content: nextToken.content, invPolish: nextToken.content}
                        ],
                        invPolish: nextToken.content
                    }
                };
            }

            return {ok: false, error: `const: must be \`true\`, \`false\` or an integer constant`};
        }
    }
};

export default DEFAULT_PARSER_RULES;