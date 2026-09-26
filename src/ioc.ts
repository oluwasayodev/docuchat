import {IocContainer, ServiceIdentifier} from "@tsoa/runtime";
import {container} from './container'


export const iocContainer: IocContainer = {
    get: <T>(controller: ServiceIdentifier<T>): T => {
        return container.resolve<T>(controller as never);
    }
}