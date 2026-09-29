import {IDocumentParser, IDocumentParsers} from "./documentParser.interface";
import {SUPPORTED_DOCUMENT_MIME_TYPES, SupportedDocumentMimeType} from "../../constants/document.constants";
import {injectable, injectAll} from "tsyringe";
import {InternalServerError} from "../../errors/http.error";


@injectable()
export class DocumentParserFactory implements IDocumentParsers {

    private readonly cache = new Map<SupportedDocumentMimeType, IDocumentParser>();

    constructor(@injectAll("IDocumentParser") private readonly parsers: IDocumentParser[]) {
        for (const mimeType of SUPPORTED_DOCUMENT_MIME_TYPES) {
            const claims = this.parsers
                .filter(parser => parser.supports(mimeType))
                .map(parser =>parser.constructor.name);

            if (claims.length !== 1) {
                throw new Error(
                    `Expected exactly 1 parser for ${mimeType}, found ${claims.length}: ${claims.join(",") || "none"}`
                )
            }
        }
    }

    resolve(mimeType: SupportedDocumentMimeType): IDocumentParser {
        const cached = this.cache.get(mimeType);
        if (cached) return cached;

        const parser = this.parsers.find((candidate) => candidate.supports(mimeType));
        if (!parser) {
            throw new InternalServerError(`No parser registered for MIME type ${mimeType}`);
        }

        this.cache.set(mimeType, parser);
        return parser;
    }
}