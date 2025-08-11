import { Number, String } from '../../config/common/transformation-types';
import { plainToClass } from '../../config/common/transformer';
import { MinLength, Min, Max, IsEnum, validateSync, ValidationError } from '../../config/common/validator';

export enum Environment {
  Local = "local",
  Development = "dev",
  Production = "prod",
  Test = "test",
  Azure = "azure",
  AWS = "aws",
  GCP = "gcp",
  IBM = "ibm"
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  // @Number()
  // @Min(3000)
  // @Max(65535)
  // PORT: number;

  @String()
  @MinLength(3)
  PROJECT_ID: string

  @String()
  @MinLength(3)
  SOLUTION_ID: string
}

export function envValidation(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((validationError: ValidationError) => validationError.toString())
        .join('\n'),
    );
  }

  return validatedConfig;
}

export function IsLocalEnv() {
  return process.env.NODE_ENV === Environment.Local;
}

export function IsDevEnv() {
  return process.env.NODE_ENV === Environment.Development;
}

export function IsProdEnv() {
  return process.env.NODE_ENV === Environment.Production;
}

export function IsTestEnv() {
  return process.env.NODE_ENV === Environment.Test;
}

