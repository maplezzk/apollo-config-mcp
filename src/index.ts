#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { EnvManager } from "./env-manager.js";
import type { EnvUrlMap } from "./types.js";

function loadEnvManager(): EnvManager {
  const raw = process.env.APOLLO_CONFIG_URLS;
  if (!raw) {
    process.stderr.write(
      "错误: 环境变量 APOLLO_CONFIG_URLS 未设置。\n" +
        "请设置为一个 JSON 对象，例如：\n" +
        '  APOLLO_CONFIG_URLS=\'{"DEV":"http://apollo-dev:8080","PRD":"http://apollo-prd:8080"}\'\n',
    );
    process.exit(1);
  }

  let urlMap: EnvUrlMap;
  try {
    urlMap = JSON.parse(raw) as EnvUrlMap;
  } catch (err) {
    process.stderr.write(
      `错误: APOLLO_CONFIG_URLS 不是合法 JSON: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }

  return new EnvManager(urlMap, process.env.APOLLO_ACCESS_KEY);
}

async function main(): Promise<void> {
  const envManager = loadEnvManager();
  const server = createServer(envManager);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // 输出到 stderr（不要污染 stdout，因为那是 MCP 通信通道）
  process.stderr.write(
    `[apollo-config-mcp] 已启动，支持环境: ${envManager.listEnvs().join(", ")}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`启动失败: ${error}\n`);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  process.stderr.write(`未捕获异常: ${error}\n`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  process.stderr.write(`未处理的 Promise 拒绝: ${reason}\n`);
  process.exit(1);
});
