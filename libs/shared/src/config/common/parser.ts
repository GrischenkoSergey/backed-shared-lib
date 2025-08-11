import * as _ from 'lodash';
import { ConfigStorage, ProcessEnv } from './types';

export const ENV_MODULE_SEPARATOR = '__';

export class ConfigParser {
  public parse(processEnv: ProcessEnv): ConfigStorage {
    const configStorage: ConfigStorage = {};

    Object.entries(processEnv).forEach(([variable, value]: [string, string]) => {
        const split = variable.split(ENV_MODULE_SEPARATOR);

        if (split.length === 1) {
          return;
        }

        const moduleName = _.toLower(split[0]);

        configStorage[moduleName] = configStorage[moduleName] || {};
        configStorage[moduleName] = this.variableToObject(configStorage[moduleName], split.slice(1), value || undefined);
      },
    );

    return configStorage;
  }

  private variableToObject(configObject: any, varParts: string[], value: any): any {
     const fieldName = _.toLower(varParts.shift());

    if (varParts.length > 0) {
      configObject[fieldName!] = this.variableToObject(configObject[fieldName!] || {}, varParts, value);
    } else if (value === 'true') {
      configObject[fieldName!] = true;
    } else if (value === 'false') {
      configObject[fieldName!] = false;
    } else if (!isNaN(Number(value))) {
      configObject[fieldName!] = Number(value);
    } else {
      configObject[fieldName!] = value;
    }

    return configObject;
  }
}