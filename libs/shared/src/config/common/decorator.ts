import { Expose } from '@ukitgroup/class-transformer';
import { CONFIG_NAME_SYMBOL } from './symbols';

export function Config(name: string): ClassDecorator {
  return (target: Function): void => {
    // eslint-disable-next-line no-param-reassign
    target[CONFIG_NAME_SYMBOL] = name;
  };
}

// export function Env(name: string): PropertyDecorator {
//   return Expose({ name });
// }
