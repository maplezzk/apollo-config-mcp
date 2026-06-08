# Apollo Config MCP Server

让 AI Agent 通过 MCP（Model Context Protocol）协议读取 Apollo 配置中心的配置。

## 功能

| Tool | 说明 |
|------|------|
| `list_envs` | 列出所有已配置的 Apollo 环境 |
| `get_config` | 实时读取 Apollo 配置（不带缓存），支持指定 key 只返回单个值 |
| `get_config_cached` | 带缓存读取 Apollo 配置，支持指定 key 只返回单个值 |
| `get_config_raw` | 读取 Apollo 原始配置内容（如 YAML、JSON 格式的 namespace） |

## 安装

```bash
npm install -g maplezzk/apollo-config-mcp
```

或从源码构建：

```bash
git clone https://github.com/maplezzk/apollo-config-mcp.git
cd apollo-config-mcp
npm install && npm run build
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `APOLLO_CONFIG_URLS` | ✅ | JSON 对象，键为环境名，值为对应环境的 Apollo Config Service 地址 |
| `APOLLO_ACCESS_KEY` | ❌ | 访问密钥，开启访问控制时需要（对所有环境生效） |

### `APOLLO_CONFIG_URLS` 示例

```json
{
  "DEV":   "http://apollo-dev:8080",
  "TEST":  "http://apollo-test:8080",
  "STAGE": "http://apollo-stage:8080",
  "PRD":   "http://apollo-prd:8080"
}
```

Shell 中设置时建议用单引号包裹：

```bash
export APOLLO_CONFIG_URLS='{"DEV":"http://apollo-dev:8080","PRD":"http://apollo-prd:8080"}'
```

## MCP 客户端配置

在 Claude Desktop / Cursor / Pi 等 MCP 客户端中添加以下配置：

```json
{
  "mcpServers": {
    "apollo-config": {
      "command": "node",
      "args": ["path/to/apollo-config-mcp/dist/index.js"],
      "env": {
        "APOLLO_CONFIG_URLS": "{\"DEV\":\"http://apollo-dev:8080\",\"PRD\":\"http://apollo-prd:8080\"}"
      }
    }
  }
}
```

## 使用示例

### list_envs — 列出环境

输出：

```json
{
  "envs": ["DEV", "TEST", "STAGE", "PRD"]
}
```

### get_config — 读取指定环境的配置

输入：

```json
{
  "env": "PRD",
  "appId": "my-service",
  "namespace": "application",
  "key": "database.url"
}
```

输出：

```
"jdbc:mysql://localhost:3306/mydb"
```

### get_config_cached — 带缓存读取整个 namespace

输入：

```json
{
  "env": "PRD",
  "appId": "my-service",
  "namespace": "application",
  "cluster": "default"
}
```

输出：

```json
{
  "database.url": "jdbc:mysql://localhost:3306/mydb",
  "database.username": "root",
  "redis.host": "127.0.0.1"
}
```

### get_config_raw — 读取原始配置（如 YAML namespace）

输入：

```json
{
  "env": "PRD",
  "appId": "my-service",
  "namespace": "datasource.yaml"
}
```

输出：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
```

## 注意事项

- `env` 参数在所有读取类 tool 中**必填**，用于选择 Apollo 环境。
- 不支持配置写入，只读。
- 访问密钥（`APOLLO_ACCESS_KEY`）对所有环境生效；若不同环境密钥不同，请使用各自独立部署的 MCP 实例。
