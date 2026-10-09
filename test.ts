import 'reflect-metadata';
import {container} from './src/container';
import {IConversationRepository} from './src/repositories/conversationRepository.interface';

const USER = '11111111-1111-1111-1111-111111111111';
const DOC  = '7f8cac39-21b0-4907-a6bf-a4a92034d729';
const TURN = 'The batch layer ingests data incrementally with exactly-once semantics while the serving layer answers low-latency queries over precomputed views. ';

const run = async () => {
    const repo = container.resolve('IConversationRepository') as IConversationRepository;

    const conv = await repo.createConversation({userId: USER, title: 'Phase B validation'});

    for (let i = 0; i < 4; i++) {
        await repo.addMessage({
            conversationId: conv.id,
            role: i % 2 === 0 ? 'USER' : 'ASSISTANT',
            content: TURN.repeat(30),
            tokenCount: 0,
        });
    }

    await repo.attachDocuments(conv.id, [DOC]);

    console.log('conversationId = ' + conv.id);
    process.exit(0);
};
run().catch(e => { console.error('ERR', e.message); process.exit(1); });