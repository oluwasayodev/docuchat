import 'reflect-metadata';
import {container} from '../src/container';
import {IChatService} from '../src/services/chatService.interface';
import {PrismaClient} from '@prisma/client';

const USER = '11111111-1111-1111-1111-111111111111';
const CONV = '247765b8-bb05-4a87-b1a3-4fbbc8cab27f';
const QUESTION = 'What is the batch layer responsible for?';
const MODEL = 'llama3.2:3b';

const run = async () => {
    const chat = container.resolve('IChatService') as IChatService;
    const prisma = container.resolve(PrismaClient);

    const before = await prisma.message.count({where: {conversationId: CONV}});
    console.log('messages before: ' + before);

    const types: string[] = [];
    let content = '';
    let reasoningCount = 0;
    let contentCount = 0;
    let reasoningAfterContent = false;
    let sawContent = false;
    let done: any = null;
    const started = Date.now();

    console.log('--- stream (reasoning events are counted, not printed) ---');
    for await (const ev of chat.chat({userId: USER, conversationId: CONV, question: QUESTION, modelId: MODEL})) {
        types.push(ev.type);
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);

        if (ev.type === 'reasoning') {
            reasoningCount++;
            if (sawContent) reasoningAfterContent = true;
            if (reasoningCount === 1) console.log('  [' + elapsed + 's] reasoning started');
            continue;
        }
        if (ev.type === 'content') {
            sawContent = true;
            contentCount++;
            content += ev.text;
            if (contentCount === 1) console.log('  [' + elapsed + 's] content started');
            continue;
        }
        if (ev.type === 'done') done = ev;

        let extra = '';
        if (ev.type === 'citations') {
            extra = ' chunks=' + ev.chunks.length;
        } else if (ev.type === 'done') {
            extra = ' messageId=' + ev.messageId + ' finish=' + ev.finishReason + ' usage=' + JSON.stringify(ev.usage);
        }
        console.log('  [' + elapsed + 's] ' + ev.type + extra);
    }

    const total = ((Date.now() - started) / 1000).toFixed(1);
    console.log('--- stream summary (total ' + total + 's) ---');
    console.log('  reasoning events: ' + reasoningCount);
    console.log('  content events:   ' + contentCount);
    console.log('  event order:      ' + types.filter((t, i) => i === 0 || t !== types[i - 1]).join(' -> '));

    console.log('--- assertions ---');
    console.log('  first event is citations:        ' + (types[0] === 'citations'));
    console.log('  last event is done:              ' + (types[types.length - 1] === 'done'));
    console.log('  has content events:              ' + (contentCount > 0));
    console.log('  reasoning never after content:   ' + !reasoningAfterContent);
    console.log('  answer length: ' + content.length + ' chars');
    console.log('  answer preview: ' + content.slice(0, 200).replace(/\n/g, ' '));

    if (done) {
        console.log('--- persisted assistant row ---');
        const saved = await prisma.message.findUnique({where: {id: done.messageId}});
        console.log('  found:       ' + !!saved);
        console.log('  role:        ' + (saved ? saved.role : 'n/a'));
        console.log('  modelId:     ' + (saved ? saved.modelId : 'n/a'));
        console.log('  tokenCount:  ' + (saved ? saved.tokenCount : 'n/a'));
        console.log('  costUsd:     ' + (saved ? saved.costUsd : 'n/a'));
        console.log('  content len: ' + (saved ? saved.content.length : 'n/a'));
        console.log('  matches stream: ' + (saved ? saved.content === content : false));
    }

    const after = await prisma.message.findMany({where: {conversationId: CONV}, orderBy: {createdAt: 'asc'}});
    console.log('--- history (' + after.length + ' rows) ---');
    after.forEach((m, i) => {
        console.log('  ' + i + '  ' + m.role + '  len=' + m.content.length + '  model=' + m.modelId + '  tokens=' + m.tokenCount);
    });

    process.exit(0);
};

run().catch(e => {
    console.error('ERR: ' + (e && e.message ? e.message : String(e)));
    process.exit(1);
});
