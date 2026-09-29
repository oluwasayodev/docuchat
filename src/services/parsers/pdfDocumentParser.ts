import {injectable} from "tsyringe";
import {DocumentFile, IDocumentParser, ParsedDocument} from "./documentParser.interface";
import {SupportedDocumentMimeType} from "../../constants/document.constants";
import {PDFParse} from "pdf-parse";
import {BadRequestException} from "../../errors/http.error";


@injectable()
export class PdfDocumentParser implements IDocumentParser {


    async parse(file: DocumentFile): Promise<ParsedDocument> {
        let parser: PDFParse | null = null;
        try {
            parser = new PDFParse({data: file.buffer})
            const result = await parser.getText({pageJoiner: ""});

            const pages = result.pages
                .map(page => ({num: page.num, text: page.text.trim()}))
                .filter(page => page.text.length > 0);

            if (pages.length === 0) {
                throw new BadRequestException("PDF contains no extractable text (It may be a scanned image)");
            }

            return {pages, pageCount: result.total}
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException("Failed to parse pdf file");
        } finally {
            await parser?.destroy();
        }
    }

    supports(mimeType: SupportedDocumentMimeType): boolean {
        return mimeType === "application/pdf"
    }


}