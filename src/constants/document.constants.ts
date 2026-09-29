
export const SUPPORTED_DOCUMENT_MIME_TYPES = [
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "text/css",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;


export type SupportedDocumentMimeType = (typeof SUPPORTED_DOCUMENT_MIME_TYPES)[number];


export const MIME_TYPE_EXTENSIONS: Record<SupportedDocumentMimeType, string> = {
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/html": ".html",
    "text/css": ".css",
    "text/csv": ".csv",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export const MIME_TYPE_ALIASES: Record<string, SupportedDocumentMimeType> = {
    "text/md": "text/markdown",
    "text/css": "text/css",
    "application/csv": "text/csv",
    "text/x-markdown": "text/markdown",
    "text/comma-separated-values": "text/csv",
    "application/x-pdf": "application/pdf",
}

export const EXTENSION_MIME_TYPES: Record<string, SupportedDocumentMimeType> = {
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".html": "text/html",
    ".css": "text/css",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

export function isSupportedDocumentMimeType(value: string): value is SupportedDocumentMimeType {
    return (SUPPORTED_DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

export function resolveDocumentMimeType(mimeType: string, filename: string): SupportedDocumentMimeType | null {
    const normalized = mimeType.split(";")[0].trim().toLowerCase();

    if (normalized in MIME_TYPE_ALIASES) {
        return MIME_TYPE_ALIASES[normalized];
    }

    if(isSupportedDocumentMimeType(normalized)) {
        return normalized;
    }

    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex === -1) {
        return null;
    }

    const extension = filename.slice(dotIndex).toLowerCase();
    return EXTENSION_MIME_TYPES[extension] ?? null;
}

