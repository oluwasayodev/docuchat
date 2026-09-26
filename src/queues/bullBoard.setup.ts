import {createBullBoard} from "@bull-board/api";
import {Queue} from "bullmq";
import {config} from "../lib/config";
import {BullMQAdapter} from "@bull-board/api/bullMQAdapter";
import {Router} from "express";
import {ExpressAdapter} from "@bull-board/express";


const serverAdapter = new ExpressAdapter();

let board: ReturnType<typeof createBullBoard> | null = null;

export function registerQueue(queue: Queue) {
    if(!board) {
        serverAdapter.setBasePath(config.bullBoardPath);
        board = createBullBoard({
            queues: [new BullMQAdapter((queue))],
            serverAdapter,
            options: {uiConfig: {boardTitle: "DocuChat Job Monitor"}}
        })
        return;
    }
    board.addQueue(new BullMQAdapter(queue));
}

export function getBullBoardRouter(): Router {
    return serverAdapter.getRouter();
}