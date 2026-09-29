import {injectable} from "tsyringe";
import {DocumentFile, IDocumentParser, ParsedDocument} from "./documentParser.interface";
import {SupportedDocumentMimeType} from "../../constants/document.constants";
import mammoth from "mammoth";
import {BadRequestException} from "../../errors/http.error";


const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";


@injectable()
export class DocxDocumentParser implements IDocumentParser {

    supports(mimeType: SupportedDocumentMimeType): boolean {
        return mimeType === DOCX_MIME_TYPE;
    }

    async parse(file: DocumentFile): Promise<ParsedDocument> {
        try {
            const {value} = await mammoth.extractRawText({buffer: file.buffer});
            const text = value.trim();

            if (!text) {
                throw new BadRequestException("DOCX file contains no extractable text");
            }

            return {pages: [{num: null, text}], pageCount: null};
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException("Failed to parse DOCX file");
        }
    }


}