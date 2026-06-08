import { ApolloClient } from "./apollo-client.js";
import type { EnvUrlMap } from "./types.js";

/**
 * 根据环境变量 APOLLO_CONFIG_URLS（JSON 格式）和可选的 APOLLO_ACCESS_KEY，
 * 创建对应环境的 ApolloClient。
 *
 * APOLLO_CONFIG_URLS 示例：
 *   {"DEV":"http://dev-apollo:8080","PRD":"http://prd-apollo:8080"}
 */
export class EnvManager {
  private readonly urlMap: EnvUrlMap;
  private readonly accessKey?: string;

  constructor(urlMap: EnvUrlMap, accessKey?: string) {
    if (!urlMap || Object.keys(urlMap).length === 0) {
      throw new Error("未配置任何 Apollo 环境地址");
    }
    this.urlMap = urlMap;
    this.accessKey = accessKey;
  }

  /** 列出所有已配置的环境名 */
  listEnvs(): string[] {
    return Object.keys(this.urlMap);
  }

  /** 获取指定环境的 ApolloClient，envName 不存在时抛出 */
  getClient(envName: string): ApolloClient {
    const url = this.urlMap[envName];
    if (!url) {
      const available = this.listEnvs().join(", ");
      throw new Error(
        `未知环境: '${envName}'。可用环境: ${available || "(无)"}`,
      );
    }
    return new ApolloClient({
      configServerUrl: url,
      accessKey: this.accessKey,
    });
  }
}
