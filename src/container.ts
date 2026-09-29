import {container} from "tsyringe";
import {PrismaClient} from "@prisma/client";
import {PrismaUserRepository} from "./repositories/prismaUserRepository";
import {UserService} from "./services/userService";
import {prisma} from "./lib/prisma";
import {PrismaRefreshTokenRepository} from "./repositories/prismaRefreshTokenRepository";
import {AuthService} from "./services/auth.service";
import {IEventBus} from "./events/eventBus.interface";
import {eventBusFactory} from "./events/events.factory";
import {IStorageService} from "./storage/storageService.interface";
import {storageFactory} from "./storage/storage.factory";
import {IUserRepository} from "./repositories/userRepository.interface";
import {IRefreshTokenRepository} from "./repositories/refreshTokenRepository.interface";
import {IUserService} from "./services/userService.interface";
import {IAuthService} from "./services/authService.interface";
import {IRoleRepository, RoleRepository} from "./repositories/roleRepository";
import {AuthProviderFactory, IAuthProviderFactory} from "./providers/auth/authProvider.factory";
import {GoogleAuthProvider} from "./providers/auth/googleAuthProvider";
import {CognitoAuthProvider} from "./providers/auth/cognitoAuthProvider";
import {ILogger} from "./logging/logger.interface";
import {loggerFactory} from "./logging/logger.factory";
import {cacheFactory} from "./cache/cache.factory";
import {ICacheService} from "./cache/cacheService.interface";
import {AppConfig, config} from "./lib/config";
import {IJobQueue} from "./queues/jobQueue.interface";
import {BullMQJobQueue} from "./queues/bullMQJobQueue";
import {IWorker} from "./workers/worker.interface";
import {workerFactory} from "./workers/worker.factory";
import {IDocumentRepository} from "./repositories/documentRepository.interface";
import {PrismaDocumentRepository} from "./repositories/prismaDocumentRepository";
import {IUsageLogRepository} from "./repositories/usageLogRepository.interface";
import {PrismaUsageLogRepository} from "./repositories/prismaUsageLogRepository";
import {TextDocumentParser} from "./services/parsers/textDocumentParser.service";
import {PdfDocumentParser} from "./services/parsers/pdfDocumentParser";
import {DocxDocumentParser} from "./services/parsers/docxDocumentParser";
import {DocumentParserFactory} from "./services/parsers/documentParser.factory";
import {IDocumentParsers} from "./services/parsers/documentParser.interface";
import {DocumentChunker} from "./services/documentChunker";
import {IDocumentChunker} from "./services/documentChunker.interface";
import {IDocumentService} from "./services/documentService.interface";
import {DocumentService} from "./services/document.service";
import {IDocumentProcessingService} from "./services/documentProcessingService.interface";
import {DocumentProcessingService} from "./services/documentProcessingService";


container.register("IAuthProvider", {useClass: GoogleAuthProvider})
container.register("IAuthProvider", {useClass: CognitoAuthProvider})


container.registerInstance(PrismaClient, prisma)
container.registerSingleton<IUserRepository>("IUserRepository", PrismaUserRepository);
container.registerSingleton<IRoleRepository>("IRoleRepository", RoleRepository);
container.registerSingleton<IDocumentRepository>("IDocumentRepository", PrismaDocumentRepository);
container.registerSingleton<IUsageLogRepository>("IUsageLogRepository", PrismaUsageLogRepository);
container.registerSingleton<IRefreshTokenRepository>("IRefreshTokenRepository", PrismaRefreshTokenRepository);
container.registerSingleton<IUserService>("IUserService", UserService);
container.registerSingleton<IAuthService>("IAuthService", AuthService);
container.registerSingleton<IAuthProviderFactory>("IAuthProviderFactory", AuthProviderFactory);
container.register<IEventBus>("IEventBus", {
    useFactory: eventBusFactory
})
container.register<IStorageService>("IStorageService", {
    useFactory: storageFactory
})

container.registerSingleton("IDocumentParser", TextDocumentParser);
container.registerSingleton("IDocumentParser", PdfDocumentParser);
container.registerSingleton("IDocumentParser", DocxDocumentParser);
container.register<IDocumentParsers>("IDocumentParsers", {useClass: DocumentParserFactory})
container.register<ILogger>("ILogger", {useFactory: loggerFactory});
container.register<ICacheService>("ICacheService", {useFactory: cacheFactory});
container.register(AppConfig, {useValue: config});
container.registerSingleton<IDocumentChunker>("IDocumentChunker", DocumentChunker);


container.register<IJobQueue>("IJobQueue", {useClass: BullMQJobQueue})
container.register<IWorker>("IWorker", {useFactory: workerFactory});
container.register<IDocumentService>("IDocumentService", {useClass: DocumentService});
container.register<IDocumentProcessingService>("IDocumentProcessingService", {useClass: DocumentProcessingService});

export {container};