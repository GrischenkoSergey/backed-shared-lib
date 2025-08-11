import { Global, DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigOptions } from './common/options';
import { ConfigFacade } from './common/facade';
import { ClassType } from './common/types';
import { ConfigGlobalModule } from './config-global.module';
import { loadConfig, SettingsConfig } from '../common/types/configs';
import { envValidation } from '../common/types/environments';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
      skipProcessEnv: false,
      validate: envValidation,
    }),
  ],
})
export class ConfigModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    let providers: Provider[] = [];
    if (options.configs) {
      providers = options.configs.map(
        (ConfigClass: ClassType): Provider => ({
          provide: ConfigClass,
          useFactory: (configFacade: ConfigFacade): typeof ConfigClass.prototype => {
            return configFacade.createConfig(ConfigClass);
          },
          inject: [ConfigFacade]
        }),
      );
    }

    return {
      module: ConfigModule,
      imports: [ConfigGlobalModule.forRoot(options)],
      providers,
      exports: providers,
    };
  }

  static forFeature(ConfigClasses: ClassType[]): DynamicModule {
    const providers: Provider[] = ConfigClasses.map(
      (ConfigClass: ClassType): Provider => ({
        provide: ConfigClass,
        inject: [ConfigFacade],
        useFactory: (configFacade: ConfigFacade): typeof ConfigClass.prototype => {
          return configFacade.createConfig(ConfigClass);
        },
      }),
    );

    return {
      module: ConfigModule,
      providers,
      exports: providers,
    };
  }
}
