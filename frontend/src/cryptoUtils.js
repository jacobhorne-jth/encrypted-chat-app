// generate AES key (256-bit)
export async function generateAESKey() {
    return await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }
  
  // export aes key to raw
  export async function exportAESKey(key) {
    const raw = await window.crypto.subtle.exportKey("raw", key);
    return new Uint8Array(raw);
  }
  
  // import a pem public key into cryptokey
  export async function importRSAPublicKey(pem) {
    const b64 = pem.replace(/-----.*?-----/g, "").replace(/\s+/g, "");
    const binaryDer = Uint8Array.from(window.atob(b64), (c) => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["encrypt"]
    );
  }
  
  // encrypt AES key with RSA public key
  export async function encryptAESKeyWithRSA(aesRawBytes, publicKey) {
    return await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      aesRawBytes
    );
  }
  
  // c9nvert arraybuffer to base 64 string
  export function bufferToBase64(buffer) {
    return window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }
  


  // Encrypt a message string with AES-GCM
  export async function encryptMessageWithAES(key, message) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
  
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
  
    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);
  
    return btoa(String.fromCharCode(...combined));
  }
  
  
  // Decrypt base64(IV + encryptedData)
  export async function decryptMessageWithAES(aesKey, b64) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
  
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      data
    );
  
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
  