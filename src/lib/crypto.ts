import crypto from "crypto";

const ALGO = "aes-256-gcm";
// 主密钥：优先读环境变量 API_CONFIG_SECRET；本地未设置时使用固定派生密钥（仅本地运行足够）。
// 生产/公网部署务必通过环境变量设置一个强随机密钥，否则库文件被拿走后密钥仍可被本应用解密。
const SECRET = process.env.API_CONFIG_SECRET || "speech-train-local-default-secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();

/** 加密明文密钥，返回 base64(iv + authTag + ciphertext)，可直接入库 */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** 解密入库的密文，返回明文 */
export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** 将密钥脱敏展示，如 sk-****7890 */
export function maskSecret(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "*".repeat(key.length);
  return `${key.slice(0, 2)}${"*".repeat(4)}${key.slice(-4)}`;
}
