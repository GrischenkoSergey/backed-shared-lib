import { IConfigExternalStorage, ProcessEnv } from "../common/types";

export class ConfigDefaultStorage implements IConfigExternalStorage {
    async load(raw?: ProcessEnv): Promise<ProcessEnv | null> {
        return null;
    }
}