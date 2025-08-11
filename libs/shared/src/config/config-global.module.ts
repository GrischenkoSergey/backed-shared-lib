import * as dotenv from 'dotenv';
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { ConfigOptions } from './common/options';
import { ConfigFacade } from './common/facade';
import { ConfigExtractor } from './common/extractor';
import { ConfigParser } from './common/parser';
import { ConfigFactory } from './common/factory';
import { ConfigValidator } from './common/config.validator';
import { ConfigDefaultStorage } from './storages/default-storage';
import { CONFIG_OPTIONS, RAW_CONFIG, EXTERNAL_STORAGE_CONFIG } from './common/tokens';
import { ProcessEnv, IConfigExternalStorage } from './common/types';

@Global()
@Module({
  providers: [
    {
      provide: ConfigExtractor,
      useFactory: () => new ConfigExtractor(dotenv.config),
    },
    {
      provide: ConfigParser,
      useClass: ConfigParser,
    },
    {
      provide: ConfigFactory,
      useClass: ConfigFactory,
    },
    {
      provide: ConfigValidator,
      useClass: ConfigValidator,
    },
  ],
})
export class ConfigGlobalModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    const imports: Array<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
    > = options.imports || [];
    const providers: Provider[] = options.providers || [];

    imports.forEach((module) => {
      if (!module) throw new Error(`Wrong import parameter \`${module}\``);
    });
    providers.forEach((provider) => {
      if (!provider)
        throw new Error(`Wrong provider parameter \`${provider}\``);
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const rawConfigProvider = providers.find((provider) => provider.provide === RAW_CONFIG);

    providers.push({
      provide: RAW_CONFIG,
      useValue: rawConfigProvider?.['useValue'] || {},
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const extStorageConfigProvider = providers.find((provider) => provider.provide === EXTERNAL_STORAGE_CONFIG);

    providers.push({
      provide: EXTERNAL_STORAGE_CONFIG,
      useClass: extStorageConfigProvider?.['useClass'] || ConfigDefaultStorage,
    });

    providers.push(
      {
        provide: CONFIG_OPTIONS,
        useValue: options,
      },
      {
        provide: ConfigFacade,
        useFactory: (
          configExtractor: ConfigExtractor,
          configParser: ConfigParser,
          configFactory: ConfigFactory,
          configValidator: ConfigValidator,
          raw: ProcessEnv,
          externalStorage: IConfigExternalStorage,
          config: NestConfigService
        ) =>
          new ConfigFacade(
            configExtractor,
            configParser,
            configFactory,
            configValidator,
            { fromFile: options.envFilePath, raw, fromExternalStorages: externalStorage },
            config,
          ).load(),
        inject: [
          ConfigExtractor,
          ConfigParser,
          ConfigFactory,
          ConfigValidator,
          RAW_CONFIG,
          EXTERNAL_STORAGE_CONFIG,
          NestConfigService
        ]
      },
    );

    return {
      module: ConfigGlobalModule,
      imports,
      providers,
      exports: providers,
    };
  }
}