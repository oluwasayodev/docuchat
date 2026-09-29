import {ParsedDocument} from "./parsers/documentParser.interface";
import {CreateChunkData} from "../repositories/documentRepository.interface";


export interface IDocumentChunker {
    chunk(parsed: ParsedDocument): Promise<CreateChunkData[]>;
}