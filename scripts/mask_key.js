// scripts/mask_key.js
// Takes the raw 32-byte AES key (printed by encrypt.js), XOR-masks every byte
// with 0xAB, and prints a Rust-ready OBFUSCATED_KEY array.
//
// Usage:
//   node mask_key.js "[12, 240, 8, ...]"     // pass the key as a JSON array arg
//   node mask_key.js                          // or paste it into RAW_KEY below

const XOR_MASK = 0xab;

// Paste the raw key here if you prefer not to use a CLI argument:
const RAW_KEY = [201, 174, 47, 57, 205, 219, 254, 62, 34, 164, 170, 66, 202, 163, 114, 186, 92, 240, 47, 170, 225, 178, 49, 99, 44, 87, 170, 243, 23, 171, 153, 244];

function maskKey(rawKey) {
  if (!Array.isArray(rawKey) || rawKey.length !== 32) {
    throw new Error(`Expected a 32-byte key array, got length ${rawKey?.length}`);
  }
  return rawKey.map((b) => {
    if (!Number.isInteger(b) || b < 0 || b > 255) {
      throw new Error(`Invalid byte value: ${b}`);
    }
    return b ^ XOR_MASK;
  });
}

function main() {
  const arg = process.argv[2];
  const rawKey = arg ? JSON.parse(arg) : RAW_KEY;

  const obfuscated = maskKey(rawKey);

  "// Paste this into wasm_decrypt/src/lib.rs");
  `const XOR_MASK: u8 = 0x${XOR_MASK.toString(16).toUpperCase()};`);
  "const OBFUSCATED_KEY: [u8; 32] = [");
  "    " + obfuscated.join(", "));
  "];");
}

main();