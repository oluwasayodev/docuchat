


const LEVEL_LABELS: Record<number, string> = {
    10: "TRACE",
    20: "DEBUG",
    30: "INFO",
    40: "WARN",
    50: "ERROR",
    60: "FATAL",
}


function pad(value: number, size = 2): string {
    return String(value).padStart(size, "0");
}

function renderValue(value: unknown): string {
    return typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
}

function formatTime(time: unknown): string {
    const date = time instanceof Date ? time: new Date(typeof time === "number" ? time : Date.now());
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}:${pad(date.getMilliseconds(), 3)}`;
}


export function formatConsoleLine(record: Record<string, any>): string {
    const {time, level, levelLabel, pid, hostname, correlationId, msg, message, err, error, ...meta} = record;
    const timeText = formatTime(time);
    const levelText = String(levelLabel ?? LEVEL_LABELS[level as number] ?? level ?? "INFO").toUpperCase().padEnd(5);
    const shortId = correlationId ? String(correlationId).slice(0, 8) : "";
    const messageText = msg ?? message ?? "";
    const metaText = Object.entries(meta).map(([k, v]) => `${k}=${renderValue(v)}`).join(" ");

    let line = `${timeText} ${levelText}${shortId ? '[' + shortId + ']' : ''} - ${messageText}${metaText ? " " + metaText : ""}`;
    if (err instanceof Error) line += `\n${err.stack ?? err.message}`;
    else if (error instanceof Error) line += `\n${error.stack ?? error.message}`;
    else if(err !== undefined || error !== undefined) line += ` err=${renderValue(err ?? error)}`;

    return line;
}