import { IParseResult } from "./parser-rules";

export interface IWriter {
    writeResult(result: IParseResult): Promise<void>;
    writeInvPolish(result: IParseResult): Promise<void>;
    writeNode(result: IParseResult): Promise<void>;
}

export class ConsoleWriter implements IWriter {
    async writeResult(result: IParseResult): Promise<void> {
        console.log(result);
    }

    async writeInvPolish(result: IParseResult): Promise<void> {
        console.log(result.node?.invPolish);
    }

    async writeNode(result: IParseResult): Promise<void> {
        console.log('digraph G {');
        await this.writeNodeInner(result.node);
        console.log('}');
    }

    protected async writeNodeInner(node: IParseResult['node']): Promise<number> {
        const myId = ++this.nodeId;

        console.log(`\tnode_${myId} [label="${node.rule}${node.content ? '\\n' + node.content : ''}"];`);

        if (node.children) {
            const childrenIds = await Promise.all(node.children.map(child => this.writeNodeInner(child)));
            for(const childId of childrenIds) {
                console.log(`\tnode_${myId} -> node_${childId};`);
            }
        }

        return myId;
    }

    protected nodeId: number = 0;
}
