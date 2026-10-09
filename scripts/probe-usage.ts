import 'reflect-metadata';
import {container} from '../src/container';
import {IChatService} from '../src/services/chatService.interface';
import {PrismaClient} from '@prisma/client';

const USER = '11111111-1111-1111-1111-111111111111';
const CONV = '247765b8-bb05-4a87-b1a3-4fbbc8cab27f';
const QUESTION = 'What is the batch layer responsible for?';
const MODEL = 'llama3.2:3b';

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

const run = async () => {
    const chat = container.resolve('IChatService') as IChatService;
    const prisma = container.resolve(PrismaClient);

    const usageBefore = await prisma.usageLog.count({where: {userId: USER, action: 'CHAT_COMPLETION'}});
    const msgBefore = await prisma.message.count({where: {conversationId: CONV}});
    console.log('usage CHAT_COMPLETION rows before: ' + usageBefore);
    console.log('messages before: ' + msgBefore);

    const types: string[] = [];
    let content = '';
    let citationsChunks = -1;
    let done: any = null;
    const started = Date.now();

    console.log('--- stream ---');
    for await (const ev of chat.chat({userId: USER, conversationId: CONV, question: QUESTION, modelId: MODEL})) {
        types.push(ev.type);
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);

        if (ev.type === 'citations') {
            citationsChunks = ev.chunks.length;
            console.log('  [' + elapsed + 's] citations chunks=' + citationsChunks);
            continue;
        }
        if (ev.type === 'reasoning') continue;
        if (ev.type === 'content') {
            content += ev.text;
            continue;
        }
        if (ev.type === 'done') {
            done = ev;
            console.log('  [' + elapsed + 's] done messageId=' + ev.messageId + ' finish=' + ev.finishReason + ' usage=' + JSON.stringify(ev.usage));
        }
    }

    const total = ((Date.now() - started) / 1000).toFixed(1);
    console.log('total ' + total + 's, answer ' + content.length + ' chars');

    console.log('--- stream assertions ---');
    assert('first event is citations', types[0] === 'citations');
    assert('last event is done', types.length > 0 && types[types.length - 1] === 'done');
    assert('has content events', content.length > 0);
    assert('citations chunks > 0', citationsChunks > 0, 'chunks=' + citationsChunks);
    assert('done has usage', done !== null && !!done.usage, JSON.stringify(done && done.usage));

    console.log('--- persisted rows ---');
    const usageAfter = await prisma.usageLog.findMany({
        where: {userId: USER, action: 'CHAT_COMPLETION'},
        orderBy: {createdAt: 'desc'},
    });
    const row = usageAfter[0] ?? null;
    const msgAfter = await prisma.message.count({where: {conversationId: CONV}});

    assert('exactly one new CHAT_COMPLETION row', usageAfter.length === usageBefore + 1,
        'before=' + usageBefore + ' after=' + usageAfter.length);
    assert('user + assistant messages persisted', msgAfter === msgBefore + 2,
        'before=' + msgBefore + ' after=' + msgAfter);

    if (row) {
        const meta: any = row.metadata ?? {};
        console.log('  row id=' + row.id + ' tokens=' + row.tokens + ' costUsd=' + row.costUsd +
            ' metadata=' + JSON.stringify(meta));
        assert('tokens > 0', row.tokens > 0, 'tokens=' + row.tokens);
        assert('costUsd is null', row.costUsd === null);
        assert('metadata.modelId', meta.modelId === MODEL, 'got ' + meta.modelId);
        assert('metadata.conversationId', meta.conversationId === CONV, 'got ' + meta.conversationId);
        assert('metadata.finishReason', meta.finishReason === 'STOP', 'got ' + meta.finishReason);
        assert('metadata.messageId matches done', meta.messageId === (done && done.messageId),
            'got ' + meta.messageId);
        assert('metadata.chunksUsed matches citations', meta.chunksUsed === citationsChunks,
            'got ' + meta.chunksUsed);
        if (done && done.usage) {
            assert('tokens === usage.totalTokens', row.tokens === done.usage.totalTokens,
                'row=' + row.tokens + ' stream=' + done.usage.totalTokens);
            assert('metadata prompt+completion === total',
                meta.promptTokens === done.usage.promptTokens && meta.completionTokens === done.usage.completionTokens,
                JSON.stringify({prompt: meta.promptTokens, completion: meta.completionTokens}));
        }
    }

    if (done) {
        const saved = await prisma.message.findUnique({where: {id: done.messageId}});
        assert('assistant row found', !!saved);
        if (saved) {
            assert('assistant tokenCount === completionTokens',
                done.usage ? saved.tokenCount === done.usage.completionTokens : false,
                'row=' + saved.tokenCount + ' stream=' + JSON.stringify(done.usage));
            assert('assistant costUsd null', saved.costUsd === null);
            assert('assistant content matches stream', saved.content === content);
        }
    }

    const history = await prisma.message.findMany({where: {conversationId: CONV}, orderBy: {createdAt: 'asc'}});
    console.log('--- history (' + history.length + ' rows) ---');
    history.forEach((m, i) => {
        console.log('  ' + i + '  ' + m.role + '  len=' + m.content.length + '  model=' + m.modelId + '  tokens=' + m.tokenCount);
    });

    console.log('=== ' + passed + ' passed, ' + failed + ' failed ===');
    process.exit(failed > 0 ? 1 : 0);
};

run().catch(e => {
    console.error('ERR: ' + (e && e.message ? e.message : String(e)));
    process.exit(1);
});
