---
title: "feat: Apollo Config MCP Server"
type: feat
status: active
date: 2026-06-08
---

# feat: Apollo Config MCP Server

## Overview

构建一个 MCP（Model Context Protocol）Server，使 AI Agent 能够通过标准 MCP 协议读取 Apollo 配置中心的配置信息。Server 使用 TypeScript 实现，基于 `@modelcontextprotocol/sdk`，通过 stdio 传输与 Agent 通信。

---

## Problem Frame

在日常开发和运维中，Agent 经常需要查看 Apollo 配置中心中的配置值来辅助排查问题、理解系统行为或验证配置正确性。目前 Agent 无法直接访问 Apollo 配置，需要人工复制粘贴。通过 MCP Server 将 Apollo 的 HTTP API 暴露为标准工具，Agent 可以自主读取配置。

---

## Requirements Trace

- R1. Agent 能通过 MCP tool 读取指定 appId/namespace 的配置
- R2. 支持带缓存和不带缓存两种读取模式
- R3. 支持配置访问密钥（签名认证）
- R4. 支持多环境（通过 config_server_url 区分）
- R5. 支持 namespace 列表查询（如果 API 支持）
- R6. 配置信息以结构化形式返回，便于 Agent 理解
- R7. 支持获取指定 key 的值，而非每次返回整个 namespace 所有配置

---

## Scope Boundaries

- 不实现配置写入/修改功能（只读）
- 不实现 long polling 配置更新推送（MCP tool 是请求-响应模式，不需要持续监听）
- 不实现 Apollo Open Platform API（管理端 API），只使用客户端 HTTP API
- 不实现 UI 界面

---

## Context & Research

### Apollo Config HTTP API

三个核心接口：

1. **带缓存读取**
   - URL: `GET {config_server_url}/configfiles/json/{appId}/{clusterName}/{namespaceName}?ip={clientIp}`
   - 返回: JSON key-value 配置对（properties 类型）或 `{ "content": "..." }`（其他类型）
   - 适合频繁轮询，有最多1秒缓存延迟

2. **不带缓存读取**
   - URL: `GET {config_server_url}/configs/{appId}/{clusterName}/{namespaceName}?releaseKey={releaseKey}`
   - 返回: `{ appId, cluster, namespaceName, configurations: {...}, releaseKey }`
   - 直接从数据库读取，实时

3. **配置更新通知**（Long Polling）
   - URL: `GET {config_server_url}/notifications/v2?appId={appId}&cluster={clusterName}&notifications={notifications}`
   - 60秒 hold，有变化返回200，无变化返回304
   - 本项目不使用此接口

**认证机制**（v1.6.0+）：
- Header `Authorization: Apollo ${appId}:${signature}`
- Header `Timestamp: ${currentTimeMillis}`
- 签名算法：对时间戳 + URL path+query 使用访问密钥进行 HMAC-SHA1 签名

**参数说明**：
- `appId`: 应用ID
- `clusterName`: 集群名，一般为 `default`
- `namespaceName`: 命名空间，默认 `application`；非 properties 类型需加后缀如 `datasources.json`

### MCP Server 技术栈

- `@modelcontextprotocol/sdk`: 官方 TypeScript SDK
- 传输方式: stdio（本地 Agent 使用）
- 暴露方式: tools（Agent 调用的函数）

---

## Key Technical Decisions

- **使用 TypeScript + @modelcontextprotocol/sdk**：官方 SDK 成熟，TypeScript 类型安全，适合快速实现
- **优先使用不带缓存接口（/configs/）作为默认读取方式**：Agent 读取配置通常是一次性查询，不需要高频轮询，实时性更重要
- **同时暴露带缓存接口作为可选 tool**：某些场景下带缓存接口更轻量
- **配置通过环境变量传入**：`APOLLO_CONFIG_URL`、`APOLLO_ACCESS_KEY`（可选）等
- **stdio 传输**：最简单的集成方式，兼容所有 MCP 客户端

---

## Open Questions

### Resolved During Planning

- **是否需要 long polling？** 不需要。MCP tool 是请求-响应模式，Agent 需要配置时主动调用即可。
- **使用哪种传输方式？** stdio。最简单且兼容性最好。

### Deferred to Implementation

- **签名算法具体实现**：需要参考 Apollo 源码中的 `Signature.java` 实现 HMAC-SHA1
- **是否需要在 MCP resource 中暴露配置**：初期先用 tool，后续可考虑 resource 方式

---

## Output Structure

```
apollo-config-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # 入口，启动 MCP Server
│   ├── server.ts             # MCP Server 定义，注册 tools
│   ├── apollo-client.ts      # Apollo HTTP API 客户端封装
│   ├── signature.ts          # 访问密钥签名算法
│   └── types.ts              # 类型定义
├── README.md
└── docs/
    └── plans/
```

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
Agent (MCP Client)
    │
    │ stdio (JSON-RPC)
    ▼
MCP Server (TypeScript)
    │
    ├── Tool: get_config(appId, namespace, cluster?, key?)
    │       → 调用 /configs/ 接口
    │       → key 为空时返回全部配置，指定 key 时只返回该 key 的值
    │
    ├── Tool: get_config_cached(appId, namespace, cluster?, key?)
    │       → 调用 /configfiles/json/ 接口，同上逻辑
    │
    └── Tool: get_config_raw(appId, namespace, cluster?)
            → 调用 /configfiles/raw/ 接口，返回原始内容
```

---

## Implementation Units

- [ ] U1. **项目初始化与基础结构**

**Goal:** 初始化 TypeScript 项目，配置构建工具和 MCP SDK 依赖

**Requirements:** R1（基础设施）

**Dependencies:** None

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `src/types.ts`

**Approach:**
- 使用 npm init 创建项目
- 安装 `@modelcontextprotocol/sdk` 和 `typescript`
- 配置 tsconfig 为 ESM 模块输出
- index.ts 作为 stdio 入口启动 server

**Patterns to follow:**
- MCP TypeScript SDK 官方示例结构

**Test expectation:** none -- 纯脚手架，通过编译验证

**Verification:**
- `npm run build` 编译通过

---

- [ ] U2. **Apollo HTTP 客户端封装**

**Goal:** 封装 Apollo Config 的 HTTP API 调用逻辑

**Requirements:** R1, R2, R4

**Dependencies:** U1

**Files:**
- Create: `src/apollo-client.ts`
- Create: `src/types.ts`（补充类型）

**Approach:**
- 使用 Node.js 原生 fetch（Node 18+）调用 Apollo HTTP API
- 封装三个方法：`getConfig`（不带缓存）、`getConfigCached`（带缓存JSON）、`getConfigRaw`（原始内容）
- 支持通过构造函数传入 `configServerUrl`、`appId`（默认值）、`cluster`（默认 default）
- 处理 304 响应（配置未变化）
- 处理错误码（400/401/404/500）并返回有意义的错误信息

**Patterns to follow:**
- 标准的 HTTP client 封装模式

**Test scenarios:**
- Happy path: 调用 getConfig 返回正确的 configurations 对象
- Happy path: 调用 getConfigCached 返回 properties 类型的 key-value
- Edge case: namespace 为非 properties 类型时返回 content 字段
- Error path: appId 不存在时返回 404 对应的友好错误信息
- Error path: 网络超时时返回超时错误

**Verification:**
- 能成功调用 Apollo 服务并解析响应

---

- [ ] U3. **访问密钥签名实现**

**Goal:** 实现 Apollo 访问密钥的 HMAC-SHA1 签名算法

**Requirements:** R3

**Dependencies:** U1

**Files:**
- Create: `src/signature.ts`

**Approach:**
- 参考 Apollo Java 源码 `Signature.java` 的签名逻辑
- 签名内容：timestamp + "\n" + URL的pathWithQuery
- 使用 Node.js crypto 模块的 `createHmac('sha1', secret)` 实现
- 输出 Base64 编码的签名值
- 在请求时添加 `Authorization` 和 `Timestamp` header

**Patterns to follow:**
- Apollo 官方签名规范

**Test scenarios:**
- Happy path: 给定固定 timestamp、path、secret，签名结果与预期一致
- Edge case: URL 包含 query parameters 时正确参与签名
- Edge case: secret 为空时不添加认证 header

**Verification:**
- 签名结果与 Apollo Java 实现一致

---

- [ ] U4. **MCP Server 定义与 Tools 注册**

**Goal:** 创建 MCP Server 实例，注册配置读取相关的 tools

**Requirements:** R1, R2, R6

**Dependencies:** U2, U3

**Files:**
- Create: `src/server.ts`
- Modify: `src/index.ts`

**Approach:**
- 使用 `McpServer` 创建 server 实例
- 注册三个 tools：
  - `get_config`: 实时读取配置（不带缓存），参数 appId、namespace、cluster（可选）、key（可选）
  - `get_config_cached`: 带缓存读取，参数同上
  - `get_config_raw`: 读取原始配置内容（无 key 过滤）
- 每个 tool 使用 zod schema 定义输入参数
- 当指定 key 时，从返回的 configurations map 中提取该 key 的值单独返回
- 当未指定 key 时，返回全部配置内容，包含元信息（appId、namespace、releaseKey 等）
- 从环境变量读取 `APOLLO_CONFIG_URL`（必填）和 `APOLLO_ACCESS_KEY`（可选）

**Patterns to follow:**
- MCP SDK 的 `server.tool()` 注册模式

**Test scenarios:**
- Happy path: 调用 get_config tool 返回包含 configurations 的结构化结果
- Happy path: 指定 key 参数时只返回该 key 对应的值
- Happy path: 调用 get_config_raw 返回原始文本内容
- Edge case: 指定的 key 不存在时返回明确提示（如 "key 'xxx' not found in namespace 'yyy'"）
- Edge case: 未配置 APOLLO_CONFIG_URL 时启动报错并给出提示
- Error path: Apollo 服务不可达时返回友好错误而非崩溃

**Verification:**
- MCP Server 启动成功，能响应 tool 列表请求
- 调用 tool 能正确返回 Apollo 配置

---

- [ ] U5. **README 和使用文档**

**Goal:** 编写 README，说明安装、配置和使用方法

**Requirements:** R4（多环境配置说明）

**Dependencies:** U4

**Files:**
- Create: `README.md`

**Approach:**
- 说明项目用途
- 列出环境变量配置项
- 提供 MCP 客户端配置示例（Claude Desktop、Cursor、Pi 等）
- 提供 tool 调用示例

**Test expectation:** none -- 文档

**Verification:**
- README 包含完整的安装和使用说明

---

## System-Wide Impact

- **Interaction graph:** MCP Client → stdio → MCP Server → HTTP → Apollo Config Service
- **Error propagation:** Apollo HTTP 错误转为 MCP tool 的 error response，不会导致 server 崩溃
- **State lifecycle risks:** 无状态设计，每次 tool 调用独立请求 Apollo
- **Unchanged invariants:** 不修改 Apollo 配置，只读访问

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Apollo Config Service 网络不可达 | 设置合理超时（10s），返回明确错误信息 |
| 访问密钥签名实现与 Java 版本不一致 | 参考 Apollo 源码逐步对照实现 |
| MCP SDK 版本变化 | 锁定依赖版本 |

---

## Sources & References

- Apollo HTTP API 文档: https://www.apolloconfig.com/#/zh/client/other-language-client-user-guide
- Apollo 签名实现: https://github.com/apolloconfig/apollo/blob/master/apollo-core/src/main/java/com/ctrip/framework/apollo/core/signature/Signature.java
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP 规范: https://modelcontextprotocol.io/specification/2025-03-26/index

---

## 任务分配策略

### 依赖与冲突判断

- U1（项目初始化）必须最先执行，其他所有任务依赖它
- U2（Apollo客户端）和 U3（签名实现）互相独立，可并行
- U4（MCP Server）依赖 U2 和 U3，必须在它们之后执行
- U5（README）依赖 U4，最后执行

### 推荐执行批次

1. **批次 1（串行）**
   - subagent 1：U1 项目初始化与基础结构
2. **主 agent 协调点**
   - 汇总变更
   - 统一执行 `npm install` 和 `npm run build`
3. **批次 2（可并行）**
   - subagent 1：U2 Apollo HTTP 客户端封装
   - subagent 2：U3 访问密钥签名实现
4. **主 agent 协调点**
   - 汇总变更
   - 检查类型冲突（两者都修改 types.ts，需合并）
   - 统一执行编译验证
5. **批次 3（串行）**
   - subagent 1：U4 MCP Server 定义与 Tools 注册
6. **主 agent 协调点**
   - 统一执行编译/测试
   - 端到端验证 MCP Server 启动和 tool 调用
7. **批次 4（串行）**
   - subagent 1：U5 README 和使用文档

### subagent 限制

- subagent 只负责实现、阅读、分析、局部修改或产出建议。
- subagent 禁止执行编译、测试、提交等操作。
- 编译、测试、提交统一由主 agent 执行。
