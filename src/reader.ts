import fs from 'node:fs/promises';

export interface IReader {
    getNextChar(): Promise<string | null>;
}

export class FileReader implements IReader {
    constructor(fileName: string) {
        this.fileName = fileName;
        this.initPromise = this.init();
    }

    async getNextChar(): Promise<string | null> {
        await this.initPromise;
        ++this.pos;
        return this.pos < this.data.length ? this.data[this.pos] : null;
    }

    protected async init(): Promise<void> {
        const file = await fs.open(this.fileName);
        this.data = await file.readFile('utf-8');
        await file.close();
    }

    private fileName: string;
    private initPromise: Promise<void>;
    private data: string | null = null;
    private pos: number = -1;
}