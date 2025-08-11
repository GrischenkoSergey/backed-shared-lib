import * as _ from 'lodash';
import { plainToClass } from '@microservices-template/shared/config/common/transformer';
import { ClassType, ConfigStorage } from './types';
import { CONFIG_NAME_SYMBOL } from './symbols';
import { WrongConfigNameError } from '../../common/errors';

export class ConfigFactory {
  public createConfig(configStorage: ConfigStorage, config: Record<string, any>, ConfigClass: ClassType): typeof ConfigClass.prototype {
    let name = _.toLower(ConfigClass[CONFIG_NAME_SYMBOL]);

    if (!name) {
      throw new WrongConfigNameError(ConfigClass.name);
    }

    const envConfigStorage = configStorage[name] || new ConfigClass();
    const fileConfigStorage = config.get(name) || new ConfigClass();

    const envConfig = plainToClass(ConfigClass, envConfigStorage)
    const fileConfig = plainToClass(ConfigClass, fileConfigStorage);

    return _.assignWith(fileConfig, envConfig, (objectVal, sourceVal) => {
      return _.isUndefined(sourceVal) ? objectVal : sourceVal;
    });
  }
}