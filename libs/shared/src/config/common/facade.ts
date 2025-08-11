import { ConfigService as NestConfigService } from '@nestjs/config';
import { ClassType, ConfigSource, ConfigStorage, ProcessEnv } from './types';
import { ConfigExtractor } from './extractor';
import { ConfigParser } from './parser';
import { ConfigFactory } from './factory';
import { ConfigValidator } from './config.validator';

export class ConfigFacade {
  private configStorage: ConfigStorage;
  private readonly configSource: ConfigSource;

  constructor(
    private readonly configExtractor: ConfigExtractor,
    private readonly configParser: ConfigParser,
    private readonly configFactory: ConfigFactory,
    private readonly configValidator: ConfigValidator,
    private readonly source: ConfigSource,
    private readonly config: NestConfigService
  ) {
    this.configSource = source;
  }

  public async load(): Promise<this> {
    const processEnv: ProcessEnv = await this.configExtractor.extract(this.configSource);

    this.configStorage = this.configParser.parse(processEnv);
    return this;
  }

  public createConfig(ConfigClass: ClassType): typeof ConfigClass.prototype {
    const config = this.configFactory.createConfig(this.configStorage, this.config, ConfigClass);

    this.configValidator.validate(config);

    return config;
  }
}