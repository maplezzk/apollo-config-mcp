export interface ApolloConfig {
  appId: string;
  cluster: string;
  namespaceName: string;
  configurations: Record<string, string>;
  releaseKey: string;
}

export interface ApolloClientOptions {
  configServerUrl: string;
  accessKey?: string;
  defaultAppId?: string;
  defaultCluster?: string;
}

/**
 * 环境名到 Apollo Config Service 地址的映射，例如：
 *   { "DEV": "http://dev-apollo:8080", "PRD": "http://prd-apollo:8080" }
 */
export type EnvUrlMap = Record<string, string>;
