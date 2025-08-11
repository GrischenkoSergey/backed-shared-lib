import { validateSync, ValidationError } from '@microservices-template/shared/config/common/validator';

export class ConfigValidator {
  public validate(config: {}): void {
    const validationErrors: ValidationError[] = validateSync(config, { skipMissingProperties: false });
    if (validationErrors.length > 0) {
      throw new Error(
        validationErrors
          .map((validationError: ValidationError) => validationError.toString())
          .join('\n'),
      );
    }
  }
}