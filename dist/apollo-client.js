import { signRequest } from "./signature.js";
export class ApolloClient {
    configServerUrl;
    accessKey;
    defaultAppId;
    defaultCluster;
    constructor(options) {
        this.configServerUrl = options.configServerUrl.replace(/\/+$/, "");
        this.accessKey = options.accessKey;
        this.defaultAppId = options.defaultAppId;
        this.defaultCluster = options.defaultCluster ?? "default";
    }
    /** 获取当前客户端的 config server 地址（去掉尾部斜杠） */
    get serverUrl() {
        return this.configServerUrl;
    }
    /**
     * 不带缓存获取配置（支持 releaseKey 增量检测）
     */
    async getConfig(appId, namespace = "application", cluster) {
        const clusterName = cluster ?? this.defaultCluster;
        const url = `${this.configServerUrl}/configs/${encodeURIComponent(appId)}/${encodeURIComponent(clusterName)}/${encodeURIComponent(namespace)}`;
        const response = await this.request(url, appId);
        return (await response.json());
    }
    /**
     * 带缓存获取配置（JSON 格式）
     */
    async getConfigCached(appId, namespace = "application", cluster) {
        const clusterName = cluster ?? this.defaultCluster;
        const url = `${this.configServerUrl}/configfiles/json/${encodeURIComponent(appId)}/${encodeURIComponent(clusterName)}/${encodeURIComponent(namespace)}`;
        const response = await this.request(url, appId);
        return (await response.json());
    }
    /**
     * 获取原始配置内容（纯文本）
     */
    async getConfigRaw(appId, namespace = "application", cluster) {
        const clusterName = cluster ?? this.defaultCluster;
        const url = `${this.configServerUrl}/configfiles/raw/${encodeURIComponent(appId)}/${encodeURIComponent(clusterName)}/${encodeURIComponent(namespace)}`;
        const response = await this.request(url, appId);
        return await response.text();
    }
    /**
     * 获取指定 key 的配置值
     */
    async getConfigValue(appId, namespace, key, cluster) {
        const config = await this.getConfig(appId, namespace, cluster);
        return config.configurations[key] ?? null;
    }
    async request(url, appId) {
        const headers = {};
        if (this.accessKey) {
            const signHeaders = signRequest(url, appId, this.accessKey);
            headers["Authorization"] = signHeaders.Authorization;
            headers["Timestamp"] = signHeaders.Timestamp;
        }
        let response;
        try {
            response = await fetch(url, { headers });
        }
        catch (error) {
            throw new Error(`Apollo 请求失败: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (!response.ok) {
            const statusMessages = {
                400: "请求参数错误",
                401: "认证失败，请检查 accessKey",
                404: "配置不存在，请检查 appId/cluster/namespace",
                500: "Apollo 服务端内部错误",
            };
            const message = statusMessages[response.status] ??
                `HTTP ${response.status} ${response.statusText}`;
            throw new Error(`Apollo 请求失败 (${response.status}): ${message}`);
        }
        return response;
    }
}
