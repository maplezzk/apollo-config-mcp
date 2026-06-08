import { createHmac } from "node:crypto";
/**
 * 为 Apollo Config 请求生成签名 Header。
 *
 * 签名算法：HMAC-SHA1(accessKey, timestamp + "\n" + pathWithQuery) -> Base64
 */
export function signRequest(url, appId, accessKey) {
    const timestamp = Date.now().toString();
    const parsed = new URL(url);
    const pathWithQuery = parsed.pathname + parsed.search;
    const stringToSign = `${timestamp}\n${pathWithQuery}`;
    const signature = createHmac("sha1", accessKey)
        .update(stringToSign)
        .digest("base64");
    return {
        Authorization: `Apollo ${appId}:${signature}`,
        Timestamp: timestamp,
    };
}
