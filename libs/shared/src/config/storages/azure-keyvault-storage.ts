import { IConfigExternalStorage, ProcessEnv } from "../common/types";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

export class ConfigAzureKeyVaultStorage implements IConfigExternalStorage {
    async load(raw?: ProcessEnv): Promise<ProcessEnv | null> {
        const keyVaultUrl = process.env["KEY_VAULT_URL"] || raw?.["KEY_VAULT_URL"];

        if (!keyVaultUrl) {
            return null;
        }

        const envValues: ProcessEnv = {};
        const credential = new DefaultAzureCredential();
        const client = new SecretClient(keyVaultUrl, credential);

        for await (let secretProperties of client.listPropertiesOfSecrets()) {
            const secret = await client.getSecret(secretProperties.name);

            let varName = secretProperties.name;

            while (varName.indexOf('-') >= 0) {
                varName = varName.replace('-', '_');
            }

            envValues[varName] = secret.value;
        }

        return envValues;
    }
}