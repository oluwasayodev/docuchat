import {ModelDescriptor} from "./modelDescriptor";


export const CHAT_MODELS: ModelDescriptor[] = [
    {
        id: "qwen3:4b",
        displayName: "Qwen3 4B",
        provider: "ollama",
        contextTokens: 8192,
        maxOutputTokens: 3000,
        supportsReasoning: true,
        estimatedTokensPerSecond: 7
    },
    {
        id: "llama3.2:3b",
        displayName: "Llama 3.2 3B",
        provider: "ollama",
        contextTokens: 8192,
        maxOutputTokens: 1024,
        supportsReasoning: false,
        estimatedTokensPerSecond: 10
    }
]
