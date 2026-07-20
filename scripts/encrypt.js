// scripts/encrypt.js
// Encrypts ../raw_models/model.glb with AES-256-GCM and writes the packed
// payload [IV(12)] + [Ciphertext] + [AuthTag(16)] to the frontend public dir.
// Uses ONLY Node's native `crypto` and `fs` — no external dependencies.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const INPUT = path.resolve(__dirname, "../raw_models/model.glb");
const OUTPUT = path.resolve(__dirname, "../frontend/public/models/model.enc");

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`❌ Input model not found: ${INPUT}`);
    console.error("   Drop your model.glb into raw_models/ and try again.");
    process.exit(1);
  }

  const plaintext = fs.readFileSync(INPUT);

  // 32-byte AES-256 key + 12-byte GCM IV (nonce)
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  // Strict packing: [IV (12)] + [Ciphertext] + [Auth Tag (16)]
  const payload = Buffer.concat([iv, ciphertext, authTag]);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, payload);

  // ⭐ NEW: Calculate the SHA-256 hash of the entire encrypted payload buffer
  const payloadHash = crypto.createHash("sha256").update(payload).digest();

  "✅ Encryption complete.");
  `   Source     : ${INPUT}`);
  `   Output     : ${OUTPUT}`);
  `   IV bytes   : 12`);
  `   Cipher bytes: ${ciphertext.length}`);
  `   Tag bytes  : 16`);
  `   Total bytes: ${payload.length}`);
  "");
  "🔑 RAW 32-BYTE KEY (copy this into mask_key.js):");
  "[" + Array.from(key).join(", ") + "]");
  "");
  "🔒 SHA-256 PAYLOAD HASH (copy this into Rust EXPECTED_PAYLOAD_HASH):");
  "[" + Array.from(payloadHash).join(", ") + "]");
}

main();