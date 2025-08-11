import { ConfigurableModuleBuilder } from '@nestjs/common';
import { InfrastructureFeatureOptions } from './common/types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
    new ConfigurableModuleBuilder<InfrastructureFeatureOptions>().setExtras({ isGlobal: true }).build();