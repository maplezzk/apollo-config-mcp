import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
export function createServer(envManager) {
    const server = new McpServer({
        name: "apollo-config",
        version: "1.1.0",
    });
    // env 参数 schema
    const envSchema = z.string().describe(`环境名（必填）。可用: ${envManager.listEnvs().join(", ")}`);
    // 通用基础参数
    const baseParams = {
        env: envSchema,
        appId: z.string().describe("应用 ID"),
        namespace: z.string().optional().describe("命名空间，默认 application"),
        cluster: z.string().optional().describe("集群，默认 default"),
    };
    // 返回结果的辅助函数
    function notFound(env, appId, ns, key, cluster) {
        return {
            content: [
                {
                    type: "text",
                    text: `Key '${key}' not found in env='${env}' appId='${appId}' cluster='${cluster}' namespace='${ns}'`,
                },
            ],
        };
    }
    server.tool("list_envs", "列出所有已配置的 Apollo 环境", {}, async () => {
        const envs = envManager.listEnvs();
        return {
            content: [
                { type: "text", text: JSON.stringify({ envs }, null, 2) },
            ],
        };
    });
    server.tool("get_config", "实时读取 Apollo 配置（不带缓存）", {
        ...baseParams,
        key: z.string().optional().describe("指定 key，只返回该 key 的值"),
    }, async ({ env, appId, namespace, cluster, key }) => {
        const client = envManager.getClient(env);
        const ns = namespace ?? "application";
        const config = await client.getConfig(appId, ns, cluster);
        if (key) {
            const value = config.configurations[key];
            if (value === undefined) {
                return notFound(env, appId, ns, key, cluster ?? "default");
            }
            return {
                content: [{ type: "text", text: value }],
            };
        }
        return {
            content: [
                { type: "text", text: JSON.stringify(config, null, 2) },
            ],
        };
    });
    server.tool("get_config_cached", "带缓存读取 Apollo 配置", {
        ...baseParams,
        key: z.string().optional().describe("指定 key，只返回该 key 的值"),
    }, async ({ env, appId, namespace, cluster, key }) => {
        const client = envManager.getClient(env);
        const ns = namespace ?? "application";
        const config = await client.getConfigCached(appId, ns, cluster);
        if (key) {
            const value = config[key];
            if (value === undefined) {
                return notFound(env, appId, ns, key, cluster ?? "default");
            }
            return {
                content: [
                    { type: "text", text: JSON.stringify(value, null, 2) },
                ],
            };
        }
        return {
            content: [
                { type: "text", text: JSON.stringify(config, null, 2) },
            ],
        };
    });
    server.tool("get_config_raw", "读取 Apollo 原始配置内容", baseParams, async ({ env, appId, namespace, cluster }) => {
        const client = envManager.getClient(env);
        const ns = namespace ?? "application";
        const raw = await client.getConfigRaw(appId, ns, cluster);
        return {
            content: [{ type: "text", text: raw }],
        };
    });
    return server;
}
