import {inject, injectable} from "tsyringe";
import {IDocumentChunker} from "./documentChunker.interface";
import {getEncoding, Tiktoken} from "js-tiktoken";
import {AppConfig} from "../lib/config";
import {ParsedDocument} from "./parsers/documentParser.interface";
import {CreateChunkData} from "../repositories/documentRepository.interface";
import {InternalServerError} from "../errors/http.error";


const REPLACEMENT_CHAR = /^\uFFFD+|\uFFFD+$/g;


@injectable()
export class DocumentChunker implements IDocumentChunker {

    private readonly encoder: Tiktoken;
    private readonly chunkSize: number;
    private readonly overlap: number;

    constructor(@inject(AppConfig) config: AppConfig) {

        this.chunkSize = config.documentChunkSizeTokens;
        this.overlap = config.documentChunkOverlapTokens;

        if (this.overlap >= this.chunkSize) {
            throw new Error(
                `documentChunkOverlapTokens (${this.overlap}) must be less than documentChunkSizeTokens ${this.chunkSize}`
            )
        }

        this.encoder = getEncoding(config.documentTokenEncoding);


    }

    async chunk(parsed: ParsedDocument): Promise<CreateChunkData[]> {
        const chunks: CreateChunkData[] = [];
        const stride = this.chunkSize - this.overlap;

        for(const page of parsed.pages) {
            const text = page.text.trim();
            if (!text) continue;

            const tokens = this.encoder.encode(text);
            if (tokens.length === 0) continue;

            for (const window of this.slide(tokens, stride)) {
                const content = this.encoder.decode(window).replace(REPLACEMENT_CHAR, "").trim();
                if (!content) continue;

                chunks.push({
                    index: chunks.length,
                    content,
                    tokenCount: this.encoder.encode(content).length,
                    metadata: {page: page.num},
                })
            }
        }

        if (chunks.length === 0) {
            throw new InternalServerError("Document produced no chunks after chunking");
        }

        return chunks;
    }


    private slide(tokens: number[], stride: number): number[][] {
        if (tokens.length <= this.chunkSize) {
            return [tokens];
        }

        const windows: number[][] = [];
        for (let start = 0; start <= tokens.length; start+=stride) {
            windows.push(tokens.slice(start, Math.min(start + this.chunkSize, tokens.length)));
        }

        return windows;
    }
}