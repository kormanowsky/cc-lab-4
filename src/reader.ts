import fs from 'node:fs/promises';

export interface IReader {
    getNextChar(): Promise<string | null>;
    copy(): IReader;
    assign(reader: IReader): void;
}

export class FileReader implements IReader {
    constructor(fileName: string)
    constructor(initData: [string, number])
    constructor(fileNameOrInitData: string | [string, number]) {
        if (typeof fileNameOrInitData === 'string') {
            this.fileName = fileNameOrInitData;
            this.initPromise = this.init();
        } else {
            this.fileName = '--internal--';
            this.initPromise = Promise.resolve();
            this.data = fileNameOrInitData[0];
            this.pos = fileNameOrInitData[1];
        }
    }

    async getNextChar(): Promise<string | null> {
        await this.initPromise;
        ++this.pos;
        return this.pos < this.data.length ? this.data[this.pos] : null;
    }

    copy(): IReader {
        return new FileReader([this.data, this.pos]);
    }

    assign(reader: IReader): void {
        this.data = (<FileReader><unknown>reader).data;
        this.pos = (<FileReader><unknown>reader).pos;
    }

    async init(): Promise<void> {
        if (this.data) {
            return;
        }
        const file = await fs.open(this.fileName);
        this.data = await file.readFile('utf-8');
        await file.close();
    }

    private fileName: string;
    private initPromise: Promise<void>;
    private data: string | null = null;
    private pos: number = -1;
}
