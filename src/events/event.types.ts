import {AuthEventMap} from "./types/auth.events";
import {DocumentsEventMap} from "./types/document.events";


export type EventMap = AuthEventMap & DocumentsEventMap;

export * from './types/auth.events'
export * from './types/document.events';