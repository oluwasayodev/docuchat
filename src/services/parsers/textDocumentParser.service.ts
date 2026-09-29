import {injectable} from "tsyringe";
import {SupportedDocumentMimeType} from "../../constants/document.constants";
import {BadRequestException} from "../../errors/http.error";
import {DocumentFile, IDocumentParser, ParsedDocument} from "./documentParser.interface";

const NAMED_ENTITIES: Record<string, string> = {
    "amp": "&", "lt": "<", "gt": ">", "quot": '"', "apos": "'", "nbsp": " ",
    "ndash": "\u2013", "mdash": "\u2014", "hellip": "\u2026",
    "lsquo": "\u2018", "rsquo": "\u2019", "ldquo": "\u201c", "rdquo": "\u201d",
    "laquo": "\u00ab", "raquo": "\u00bb", "copy": "\u00a9",
    "reg": "\u00ae", "trade": "\u2122", "deg": "\u00b0", "euro": "\u20ac",
};

const BLOCK_TAGS =
    "address|article|aside|blockquote|body|caption|dd|div|dl|dt|fieldset|figcaption|" +
    "figure|footer|form|h[1-6]|head|header|hr|html|li|main|nav|ol|optgroup|option|" +
    "p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul|br";

@injectable()
export class TextDocumentParser implements IDocumentParser {
    private static readonly SUPPORTED = new Set<SupportedDocumentMimeType>([
        "text/plain",
        "text/markdown",
        "text/csv",
        "text/css",
        "text/html",
    ]);

    supports(mimeType: SupportedDocumentMimeType): boolean {
        return TextDocumentParser.SUPPORTED.has(mimeType);
    }

    async parse(file: DocumentFile): Promise<ParsedDocument> {
        const raw = TextDocumentParser.decodeUtf8(file.buffer);
        const text = file.mimeType === "text/html" ? TextDocumentParser.stripHtml(raw) : raw;

        if (!text.trim()) {
            throw new BadRequestException("File contains no extractable text");
        }

        return {pages: [{num: null, text}], pageCount: null};
    }

    private static decodeUtf8(buffer: Buffer): string {
        const text = buffer.toString("utf8");
        return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    }

    private static decodeEntities(value: string): string {
        return value.replace(
            /&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi,
            (match: string, entity: string): string => {
                if (entity.startsWith("#")) {
                    const code = entity[1] === "x" || entity[1] === "X"
                        ? parseInt(entity.slice(2), 16)
                        : parseInt(entity.slice(1), 10);
                    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
                    try {
                        return String.fromCodePoint(code);
                    } catch {
                        return match;
                    }
                }
                return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
            },
        );
    }

    private static stripHtml(html: string): string {
        return TextDocumentParser.decodeEntities(
            html
                .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
                .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
                .replace(/<!--[\s\S]*?-->/g, " ")
                .replace(new RegExp(`</?(?:${BLOCK_TAGS})\\b[^>]*>`, "gi"), "\n")
                .replace(/<[^>]+>/g, " "),
        )
            .replace(/[^\S\n]+/g, " ")
            .replace(/[^\S\n]*\n[^\S\n]*/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }
}