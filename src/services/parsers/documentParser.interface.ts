import {SupportedDocumentMimeType} from "../../constants/document.constants";


export interface ParsedPage {
    num: number | null;
    text: string;
}

export interface ParsedDocument {
    pages: ParsedPage[];
    pageCount: number | null;
}


export interface DocumentFile {
    buffer: Buffer;
    mimeType: SupportedDocumentMimeType;
    originalName: string;
}

export interface IDocumentParser {
    supports(mimeType: SupportedDocumentMimeType): boolean;
    parse(file: DocumentFile): Promise<ParsedDocument>
}

export interface IDocumentParsers {
    resolve(mimeType: SupportedDocumentMimeType): IDocumentParser;
}