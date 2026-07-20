// wasm_decrypt/src/lib.rs
// De-obfuscates the AES-256 key in memory and decrypts an AES-256-GCM payload
// packed as [IV(12)] + [Ciphertext] + [Auth Tag(16)].
// Verifies payload integrity via SHA-256 before attempting decryption.

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use wasm_bindgen::prelude::*;
// ⭐ NEW: Import SHA-256 traits from the sha2 crate
use sha2::{Sha256, Digest};

// XOR mask applied to every key byte at "compile time" (stored obfuscated).
const XOR_MASK: u8 = 0xAB;

// SAMPLE obfuscated key. Replace these 32 bytes with the output of mask_key.js.
// (These sample bytes are just placeholders so the file compiles.)
const OBFUSCATED_KEY: [u8; 32] = [
    98, 5, 132, 146, 102, 112, 85, 149, 137, 15, 1, 233, 97, 8, 217, 17, 247, 91, 132, 1, 74, 25, 154, 200, 135, 252, 1, 88, 188, 0, 50, 95
];

// ⭐ NEW: SAMPLE expected SHA-256 hash. Replace these 32 bytes with the
// "🔒 SHA-256 PAYLOAD HASH" output from your updated encrypt.js script.
const EXPECTED_PAYLOAD_HASH: [u8; 32] = [82, 227, 154, 56, 241, 7, 107, 166, 223, 88, 101, 66, 38, 146, 121, 4, 239, 112, 210, 168, 211, 123, 181, 166, 160, 102, 217, 11, 137, 71, 184, 48];

/// Decrypts an AES-256-GCM payload and returns the raw plaintext bytes.
///
/// Payload layout: [IV (12 bytes)] + [Ciphertext] + [Auth Tag (16 bytes)].
/// The aes-gcm crate expects the 16-byte tag appended to the ciphertext,
/// so `&payload[12..]` (ciphertext + tag) can be passed directly to decrypt().
#[wasm_bindgen]
pub fn decrypt_model(encrypted_payload: &[u8]) -> Result<Vec<u8>, JsValue> {
    // 12-byte IV + at least a 16-byte tag = 28 bytes minimum.
    if encrypted_payload.len() < 28 {
        return Err(JsValue::from_str(
            "Invalid payload: expected at least 28 bytes (IV + tag).",
        ));
    }

    // ⭐ STEP 1: SHA-256 INTEGRITY VERIFICATION
    // Calculate the SHA-256 hash of the incoming encrypted payload buffer.
    let mut hasher = Sha256::new();
    hasher.update(encrypted_payload);
    let calculated_hash = hasher.finalize();

    // If the hash does not match our authorized whitelist, abort immediately!
    if calculated_hash.as_slice() != EXPECTED_PAYLOAD_HASH {
        return Err(JsValue::from_str(
            "⚠ Integrity Check Failed: Unauthorized or modified Wasm payload!",
        ));
    }

    // ⭐ STEP 2: Reassemble the real key in memory via the XOR loop.
    let mut key_bytes = [0u8; 32];
    for i in 0..32 {
        key_bytes[i] = OBFUSCATED_KEY[i] ^ XOR_MASK;
    }

    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let nonce = Nonce::from_slice(&encrypted_payload[0..12]);
    let ciphertext_and_tag = &encrypted_payload[12..];

    // ⭐ STEP 3: Decrypt the payload
    cipher
        .decrypt(nonce, ciphertext_and_tag)
        .map_err(|e| JsValue::from_str(&format!("Decryption failed: {:?}", e)))
}