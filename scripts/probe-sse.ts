import 'reflect-metadata';
import {container} from '../src/container';
import {PrismaClient} from '@prisma/client';
import jwt from 'jsonwebtoken';
import {config} from '../src/lib/config';

const BASE = 'http://localhost:4000/api/v1';
const USER_B = '11111111-1111-1111-1111-111111111111';
const USER_A = '0212e0c5-230f-42ef-8d44-21d8257b92a8';
const CONV = '247765b8-bb05-4a87-b1a3-4fbbc8cab27f';
const MODEL = 'llama3.2:3b';
const QUESTION = 'What is the batch layer responsible for?';

const tokenB = jwt.sign(
    {id: USER_B, email: 'repo-smoke@test.local', roles: [], permissions: []},
    config.jwtSecret,
    {expiresIn: '2h'},
);
const tokenA = jwt.sign(
    {id: USER_A, email: 'oluwasayo.dev@gmail.com', roles: [], permissions: []},
    config.jwtSecret,
    {expiresIn: '2h'},
);

let passed = 0;
let failed = 0;

function assert(desc: string, ok: boolean, detail?: string): void {
    if (ok) {
        passed++;
        console.log('  PASS  ' + desc);
    } else {
        failed++;
        console.log('  FAIL  ' + desc + (detail !== undefined ? ' | ' + detail : ''));
    }
}

interface Frame {
    event: string;
    data: any;
}

let lastContentType = '';

async function streamFrames(signal?: AbortSignal, stopAfter?: string, question: string = QUESTION): Promise<Frame[]> {
    const res = await fetch(`${BASE}/conversations/${CONV}/messages`, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + tokenB,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({question, modelId: MODEL}),
        signal,
    });
    lastContentType = res.headers.get('content-type') ?? '';

    if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const frames: Frame[] = [];
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    outer: for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            let event = 'message';
            const dataLines: string[] = [];
            for (const line of raw.split('\n')) {
                if (line.startsWith('event: ')) event = line.slice(7);
                else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
            }
            const frame: Frame = {event, data: JSON.parse(dataLines.join('\n'))};
            frames.push(frame);
            console.log(`  frame ${frames.length}: ${frame.event}`);
            if (stopAfter !== undefined && frame.event === stopAfter) {
                break outer;
            }
        }
    }
    return frames;
}

async function hit(path: string, token?: string, body?: unknown): Promise<{ status: number; contentType: string; body: any }> {
    const headers: Record<string, string> = {};
    if (token !== undefined) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(BASE + path, {
        method: 'POST',
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
    return {status: res.status, contentType: res.headers.get('content-type') ?? '', body: parsed};
}

const run = async () => {
    const prisma = container.resolve(PrismaClient);

    console.log('=== case 1: full stream ===');
    const usageBefore = await prisma.usageLog.count({where: {userId: USER_B, action: 'CHAT_COMPLETION'}});
    const msgBefore = await prisma.message.count({where: {conversationId: CONV}});

    const started = Date.now();
    let frames: Frame[] = [];
    try {
        frames = await streamFrames();
    } catch (error: any) {
        console.log('  stream failed: ' + error.message);
    }
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log('  elapsed: ' + elapsed + 's | content-type: ' + lastContentType);

    const types = frames.map(f => f.event);
    assert('content-type is text/event-stream', lastContentType.includes('text/event-stream'), lastContentType);
    assert('citations frame received', types.includes('citations'), types.join(','));
    assert('content frame received', types.includes('content'), types.join(','));
    assert('done frame is last', types[types.length - 1] === 'done', types.join(','));
    assert('no error frame', !types.includes('error'));
    const citations = frames.find(f => f.event === 'citations');
    assert('citations has chunks array', Array.isArray(citations?.data?.chunks));
    const scores: number[] = (citations?.data?.chunks ?? []).map((c: any) => c.score);
    console.log('  scores: ' + scores.map(s => Number(s).toFixed(4)).join(', '));
    assert('context chunks returned (above minScore)', scores.length > 0, scores.length + ' chunks');
    const done = frames.find(f => f.event === 'done');
    assert('done has messageId', typeof done?.data?.messageId === 'string');
    assert(
        'done has usage with totalTokens > 0',
        done?.data?.usage != null && done.data.usage.totalTokens > 0,
        JSON.stringify(done?.data?.usage),
    );

    const usageAfter = await prisma.usageLog.count({where: {userId: USER_B, action: 'CHAT_COMPLETION'}});
    const msgAfter = await prisma.message.count({where: {conversationId: CONV}});
    assert('usage row +1', usageAfter === usageBefore + 1, `${usageBefore} -> ${usageAfter}`);
    assert('messages +2', msgAfter === msgBefore + 2, `${msgBefore} -> ${msgAfter}`);

    console.log('=== case 2: client disconnect after citations ===');
    const usageMid = await prisma.usageLog.count({where: {userId: USER_B, action: 'CHAT_COMPLETION'}});
    const ac = new AbortController();
    let sawCitations = false;
    try {
        await streamFrames(ac.signal, 'citations');
        sawCitations = true;
    } catch (error: any) {
        console.log('  stream error: ' + error.name + ': ' + error.message);
    }
    ac.abort();
    await new Promise(resolve => setTimeout(resolve, 3000));
    const usagePost = await prisma.usageLog.count({where: {userId: USER_B, action: 'CHAT_COMPLETION'}});
    assert('client saw citations before abort', sawCitations);
    assert('no usage row from aborted stream', usagePost === usageMid, `${usageMid} -> ${usagePost}`);
    const alive = await fetch(BASE + '/conversations', {headers: {Authorization: 'Bearer ' + tokenB}});
    assert('server alive after disconnect', alive.status === 200, String(alive.status));

    console.log('=== error cases ===');
    const noAuth = await hit(`/conversations/${CONV}/messages`, undefined, {question: QUESTION});
    assert('no token -> 401', noAuth.status === 401, String(noAuth.status));

    const badBody = await hit(`/conversations/${CONV}/messages`, tokenB, {question: ''});
    assert('blank question -> 400 JSON', badBody.status === 400 && badBody.contentType.includes('application/json'),
        `${badBody.status} ${badBody.contentType}`);

    const foreign = await hit(`/conversations/${CONV}/messages`, tokenA, {question: QUESTION});
    assert('foreign conversation -> 404 JSON', foreign.status === 404 && foreign.contentType.includes('application/json'),
        `${foreign.status} ${foreign.contentType}`);

    const badModel = await hit(`/conversations/${CONV}/messages`, tokenB, {question: QUESTION, modelId: 'nope'});
    assert('unknown model -> 500 JSON', badModel.status === 500 && badModel.contentType.includes('application/json'),
        `${badModel.status} ${badModel.contentType}`);
    assert('unknown model message', String(badModel.body?.message ?? '').includes('Unknown chat model'),
        JSON.stringify(badModel.body));

    console.log('=== case 3: out-of-corpus question -> grounded refusal ===');
    const msgPre9 = await prisma.message.count({where: {conversationId: CONV}});
    let frames9: Frame[] = [];
    try {
        frames9 = await streamFrames(undefined, undefined,
            'What is the employee reimbursement policy for home office equipment?');
    } catch (error: any) {
        console.log('  stream failed: ' + error.message);
    }
    const types9 = frames9.map(f => f.event);
    const cit9 = frames9.find(f => f.event === 'citations');
    const scores9: number[] = (cit9?.data?.chunks ?? []).map((c: any) => c.score);
    console.log('  scores: ' + (scores9.length ? scores9.map(s => Number(s).toFixed(4)).join(', ') : '(none)'));
    const topChunk9 = cit9?.data?.chunks?.[0];
    if (topChunk9) console.log('  top chunk: ' + String(topChunk9.content ?? '').slice(0, 160).replace(/\s+/g, ' '));
    assert('all returned scores above minScore',
        scores9.every(s => s >= config.minScore), JSON.stringify(scores9));
    assert('done frame is last', types9[types9.length - 1] === 'done', types9.join(','));
    assert('no error frame', !types9.includes('error'), types9.join(','));
    const msgPost9 = await prisma.message.count({where: {conversationId: CONV}});
    assert('messages +2', msgPost9 === msgPre9 + 2, `${msgPre9} -> ${msgPost9}`);
    const answer9 = frames9.filter(f => f.event === 'content').map(f => f.data?.text ?? '').join('');
    console.log('  answer: ' + answer9.slice(0, 300).replace(/\s+/g, ' '));
    if (!/couldn'?t find|could not find|don'?t have|do not have|no (relevant )?(information|context)|cannot find|not (found|available|mentioned)/i.test(answer9)) {
        console.log('  WARN: answer does not clearly state the information is missing');
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
};

run().catch(error => {
    console.error(error);
    process.exit(1);
});