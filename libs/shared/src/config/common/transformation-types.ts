import * as moment from 'moment'
import { ToBoolean, ToInteger, Transform } from './transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsString,
  IsDate,
  isObject,
  ValidationOptions,
  registerDecorator,
  ValidationArguments
} from './validator';

export function Integer(): PropertyDecorator {
  return (target: Object, propertyName: string): void => {
    ToInteger()(target, propertyName);
    IsInt()(target, propertyName);
  };
}

export function Boolean(): PropertyDecorator {
  return (target: Object, propertyName: string): void => {
    ToBoolean()(target, propertyName);
    IsBoolean()(target, propertyName);
  };
}

export function Number(): PropertyDecorator {
  return (target: Object, propertyName: string): void => {
    Transform((value) => parseFloat(value))(target, propertyName);
    IsNumber()(target, propertyName);
  };
}

export function Date(): PropertyDecorator {
  return (target: Object, propertyName: string): void => {
    Transform((value) => {
      return moment(value).toDate();
    })(target, propertyName);
    IsDate()(target, propertyName);
  };
}

export function Record(): PropertyDecorator {
  return (target: Object, propertyName: string): void => {
    Transform(value => {
      const records: Record<string, string> = {};

      value?.forEach(item => {
        if (typeof item === 'string') {
          records[item.split(':')[0]] = item.split(':')[1].trim();
        } else {
          records[Object.keys(item)[0]] = Object.values(item)[0] as any;
        }
      });

      return records;
    })(target, propertyName);
    IsRecord()(target, propertyName);
  }
}

export function String(): PropertyDecorator {
  return IsString();
}

export const IsRecord = (validationOptions?: ValidationOptions) => {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'IsRecord',
      target: object?.constructor!,
      propertyName: propertyName,
      constraints: [],
      options: {
        message: 'Wrong object format',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (!isObject(value)) return false;
          if (Object.keys(value).length === 0) return true;

          const keys = Object.keys(value);

          return keys.every(key => {
            if (typeof key !== 'string') return false;
            if (!(typeof value[key] === 'string' || typeof value[key] === 'number')) return false;

            return true;
          });
        },
      },
    });
  };
};