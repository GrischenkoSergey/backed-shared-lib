import { BackendError } from './backend.error';

export class WrongConfigNameError extends BackendError {
    constructor (configName: string) {
        super(`Config class ${configName} either does not have a name or does not exist. Please set the name using the @Config() decorator.`);
    }
}
