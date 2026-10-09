import jwt from "jsonwebtoken";
import {config} from "../src/lib/config";

const BASE = "http://localhost:4000/api/v1";
const SWAGGER = "http://localhost:4000/swagger";

const USER_A = "0212e0c5-230f-42ef-8d44-21d8257b92a8";
const USER_B = "11111111-1111-1111-1111-111111111111";
const DOC_A = "7f8cac39-21b0-4907-a6bf-a4a92034d729";
const DOC_B = "44444444-4444-4444-4444-444444444444";
const MISSING_DOC = "99999999-9999-4999-8999-999999999999";
const FIXED_CONV = "247765b8-bb05-4a87-b1a3-4fbbc8cab27f";

const tokenA = jwt.sign(
    {id: USER_A, email: "oluwasayo.dev@gmail.com", roles: [], permissions: []},
    config.jwtSecret,
    {expiresIn: "2h"},
);
const tokenB = jwt.sign(
    {id: USER_B, email: "repo-smoke@test.local", roles: [], permissions: []},
    config.jwtSecret,
    {expiresIn: "2h"},
);

interface Res {
    status: number;
    body: any;
    raw: string;
}

let passed = 0;
let failed = 0;
let counter = 0;
const notes: string[] = [];

async function hit(path: string, method: string, token?: string, body?: unknown, absolute = false): Promise<Res> {
    const headers: Record<string, string> = {};
    if (token !== undefined) headers.Authorization = "Bearer " + token;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(absolute ? path : BASE + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await res.text();
    let parsed: any = raw;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = raw;
    }
    return {status: res.status, body: parsed, raw};
}

async function check(
    desc: string,
    expected: number | number[],
    run: () => Promise<Res>,
    inspect?: (r: Res) => string | null,
    failNote?: string,
): Promise<Res> {
    counter++;
    const r = await run();
    const exp = Array.isArray(expected) ? expected : [expected];
    let problem: string | null = exp.includes(r.status) ? null : "expected " + exp.join("/") + " got " + r.status;
    if (problem === null && inspect !== undefined) problem = inspect(r);
    if (problem !== null) {
        failed++;
        console.log("#" + counter + " FAIL  " + desc + " | " + problem);
        if (r.raw.length < 400) console.log("       body: " + r.raw);
        if (failNote !== undefined && !notes.includes(failNote)) notes.push(failNote);
    } else {
        passed++;
        console.log("#" + counter + " PASS  " + desc + " -> " + r.status);
    }
    return r;
}

const msg = (r: Res): string =>
    typeof r.body?.message === "string" ? r.body.message : "";

const hasMsg = (fragment: string) => (r: Res): string =>
    (msg(r).toLowerCase().includes(fragment) ? null : "error message missing '" + fragment + "' (got: '" + msg(r) + "')");

const validationShape = (r: Res): string | null =>
    r.body && typeof r.body === "object" && ("errors" in r.body || "fields" in r.body)
        ? null
        : "expected validation payload with errors[] or fields{}";

const tsoaShape = (r: Res): string | null =>
    r.body && typeof r.body === "object" && "fields" in r.body
        ? null
        : "expected tsoa ValidateError payload with fields{}";

const NOTE_TITLE = 'POST /conversations without title -> 400: service checks `title === null` but absent body yields undefined -> 400 "Title must not be blank" (fix: `title == null`)';
const NOTE_SERIALIZE = "error bodies are mangled on endpoints whose Serialize middleware wrapped res.json: errorHandler .json() runs through plainToInstance(Dto)+excludeExtraneousValues -> only @Expose'd keys survive ({} / {status:'failed'}) (fix: delete res.json at top of globalErrorHandler)";
const NOTE_LIST = "GET /conversations always 400: list validates the empty BODY against ConversationListResponse (a response DTO with no class-validator decorators) -> class-validator forbidUnknownValues unknownValue (fix: remove validateDtoMiddleware from list)";
const NOTE_LIMIT = "GET /messages without limit returns 1 row: controller passes `limit || 0` and service clamps 0 -> 1 (fix: default 50 at controller)";

const run = async (): Promise<void> => {
    console.log("=== conversation API matrix (main flow = user B) ===");

    let convId = "";

    const noTitle = await check(
        "POST /conversations {} (title optional per DTO)",
        201,
        () => hit("/conversations", "POST", tokenB, {}),
        undefined,
        NOTE_TITLE,
    );
    if (noTitle.status === 201 && typeof noTitle.body?.id === "string") {
        await hit("/conversations/" + noTitle.body.id, "DELETE", tokenB);
    }

    const created = await check("POST /conversations {title}", 201, () =>
        hit("/conversations", "POST", tokenB, {title: "API matrix"}));
    if (created.status === 201 && typeof created.body?.id === "string") convId = created.body.id;

    if (convId === "") {
        console.log("cannot continue without a conversation id");
        process.exit(1);
    }

    await check("POST /conversations {title:'   '} (blank) names the reason", 400, () =>
        hit("/conversations", "POST", tokenB, {title: "   "}),
        hasMsg("blank"),
        NOTE_SERIALIZE);

    await check("POST /conversations {title: 250 chars}", 400, () =>
        hit("/conversations", "POST", tokenB, {title: "x".repeat(250)}));

    await check("POST /conversations {title: 123} (wrong type)", 400, () =>
        hit("/conversations", "POST", tokenB, {title: 123}), validationShape);

    await check("POST /conversations {unexpected: 'x'} (extra prop)", 400, () =>
        hit("/conversations", "POST", tokenB, {unexpected: "x"}), validationShape);

    await check("GET /conversations (no token)", 401, () => hit("/conversations", "GET"));

    await check("GET /conversations (list shape)", 200, () => hit("/conversations", "GET", tokenB), (r) =>
        Array.isArray(r.body?.items) && r.body?.meta ? null : "missing items[]/meta", NOTE_LIST);

    await check("GET /conversations?sortBy=bogus (tsoa enum)", 400, () =>
        hit("/conversations?sortBy=bogus", "GET", tokenB), tsoaShape, NOTE_LIST);

    await check("GET /conversations?sortBy=createdAt&sortOrder=desc", 200, () =>
        hit("/conversations?sortBy=createdAt&sortOrder=desc&page=1&limit=5", "GET", tokenB), undefined, NOTE_LIST);

    await check("GET /conversations/{id} (owner) + documents[]", 200, () =>
        hit("/conversations/" + convId, "GET", tokenB),
        (r) => (Array.isArray(r.body?.documents) ? null : "missing documents[]"));

    await check("GET /conversations/{foreign} (A reads B's conv)", 404, () =>
        hit("/conversations/" + convId, "GET", tokenA), hasMsg("not found"), NOTE_SERIALIZE);

    await check("PATCH /conversations/{id} {title}", 200, () =>
        hit("/conversations/" + convId, "PATCH", tokenB, {title: "Renamed by matrix"}),
        (r) => (r.body?.title === "Renamed by matrix" ? null : "title not updated"));

    await check("PATCH {title:'   '} (blank) names the reason", 400, () =>
        hit("/conversations/" + convId, "PATCH", tokenB, {title: "   "}),
        hasMsg("blank"), NOTE_SERIALIZE);

    await check("PATCH foreign conv (A on B's)", 404, () =>
        hit("/conversations/" + convId, "PATCH", tokenA, {title: "hijack"}), hasMsg("not found"), NOTE_SERIALIZE);

    const msgs50 = await check("GET /messages?limit=50", 200, () =>
        hit("/conversations/" + FIXED_CONV + "/messages?limit=50", "GET", tokenB),
        (r) => (Array.isArray(r.body) ? null : "not an array"));
    console.log("       rows: " + (Array.isArray(msgs50.body) ? msgs50.body.length : "?"));

    const msgsDefault = await check("GET /messages (no limit)", 200, () =>
        hit("/conversations/" + FIXED_CONV + "/messages", "GET", tokenB),
        (r) => (Array.isArray(r.body) ? null : "not an array"));
    const defaultCount = Array.isArray(msgsDefault.body) ? msgsDefault.body.length : -1;
    console.log("       rows: " + defaultCount);
    if (defaultCount >= 0 && defaultCount <= 1 && !notes.includes(NOTE_LIMIT)) notes.push(NOTE_LIMIT);

    await check("GET /messages?limit=2 (clamped range)", 200, () =>
        hit("/conversations/" + FIXED_CONV + "/messages?limit=2", "GET", tokenB),
        (r) => (Array.isArray(r.body) && r.body.length === 2 ? null : "expected exactly 2 rows"));

    await check("GET /messages?limit=abc (tsoa number)", 400, () =>
        hit("/conversations/" + FIXED_CONV + "/messages?limit=abc", "GET", tokenB),
        tsoaShape, NOTE_SERIALIZE);

    await check("POST /{id}/documents {documentIds:[B's own READY doc]}", 200, () =>
        hit("/conversations/" + convId + "/documents", "POST", tokenB, {documentIds: [DOC_B]}),
        (r) =>
            Array.isArray(r.body) && r.body.some((d: any) => d.documentId === DOC_B)
                ? null
                : "attachments missing " + DOC_B);

    await check("POST /{id}/documents A's doc from B's token (reject-all 400)", 400, () =>
        hit("/conversations/" + convId + "/documents", "POST", tokenB, {documentIds: [DOC_A]}),
        hasMsg("7f8cac39"),
        "cross-tenant attach not rejected with 400 naming the id");

    await check("POST /{id}/documents unknown id names it", 400, () =>
        hit("/conversations/" + convId + "/documents", "POST", tokenB, {documentIds: [MISSING_DOC]}),
        hasMsg("99999999"));

    await check("POST /{id}/documents {documentIds: []}", 400, () =>
        hit("/conversations/" + convId + "/documents", "POST", tokenB, {documentIds: []}));

    await check("POST /{id}/documents {} (missing field)", 400, () =>
        hit("/conversations/" + convId + "/documents", "POST", tokenB, {}));

    await check("POST /{id}/documents {documentIds: [123]}", 400, () =>
        hit("/conversations/" + convId + "/documents", "POST", tokenB, {documentIds: [123]}));

    await check("GET /{id} shows attached doc", 200, () =>
        hit("/conversations/" + convId, "GET", tokenB),
        (r) =>
            Array.isArray(r.body?.documents) &&
            r.body.documents.length === 1 &&
            r.body.documents[0].documentId === DOC_B
                ? null
                : "expected exactly 1 attachment (" + DOC_B + ")");

    await check("DELETE /{id}/documents/{docId}", 204, () =>
        hit("/conversations/" + convId + "/documents/" + DOC_B, "DELETE", tokenB));

    await check("DELETE same doc again (deleteMany idempotent)", 204, () =>
        hit("/conversations/" + convId + "/documents/" + DOC_B, "DELETE", tokenB));

    await check("DELETE /{foreignConv}/documents/{docId} (A on B's)", 404, () =>
        hit("/conversations/" + FIXED_CONV + "/documents/" + DOC_B, "DELETE", tokenA),
        hasMsg("not found"));

    await check("DELETE /{id} -> 204", 204, () =>
        hit("/conversations/" + convId, "DELETE", tokenB));

    await check("GET /{id} after delete -> 404", 404, () =>
        hit("/conversations/" + convId, "GET", tokenB), hasMsg("not found"), NOTE_SERIALIZE);

    await check("DELETE /{id} again -> 404 (no Serialize on remove)", 404, () =>
        hit("/conversations/" + convId, "DELETE", tokenB), hasMsg("not found"));

    await check("GET /{foreignConv}/messages (A on B's conv)", 404, () =>
        hit("/conversations/" + FIXED_CONV + "/messages", "GET", tokenA), hasMsg("not found"), NOTE_SERIALIZE);

    await check("GET /swagger", 200, () => hit(SWAGGER, "GET", undefined, undefined, true));

    counter++;
    const init = await fetch("http://localhost:4000/swagger/swagger-ui-init.js");
    const initText = await init.text();
    if (init.status === 200 && initText.includes('"conversations"')) {
        passed++;
        console.log("#" + counter + " PASS  swagger-ui-init.js contains conversations tag");
    } else {
        failed++;
        console.log("#" + counter + " FAIL  swagger-ui-init.js status=" + init.status + " hasTag=" + initText.includes('"conversations"'));
    }

    console.log("=== summary: " + passed + " passed, " + failed + " failed ===");
    if (notes.length > 0) {
        console.log("--- findings ---");
        notes.forEach((n) => console.log(" * " + n));
    }
    process.exit(failed > 0 ? 1 : 0);
};

run().catch((e) => {
    console.error("ERR: " + (e && e.message ? e.message : String(e)));
    process.exit(1);
});
