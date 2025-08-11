import { ConfigSource, ProcessEnv } from './types';

export class ConfigExtractor {
  constructor(private readonly fileConfigExtractor: Function) {
  }

  public async extract(source: ConfigSource): Promise<ProcessEnv> {
    const { fromFile, raw = {}, fromExternalStorages } = source;

    if (fromFile) {
      this.fileConfigExtractor({ path: fromFile });
    }

    const externalConfig = await fromExternalStorages?.load(raw) || {};

    return { ...process.env, ...raw, ...externalConfig };
  }
}
