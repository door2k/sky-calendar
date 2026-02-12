// Edge-compatible Web Push implementation using Web Crypto API
// Implements VAPID (RFC 8292) and Message Encryption (RFC 8291)

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}

async function createVapidJwt(
  audience: string,
  subject: string,
  publicKeyBytes: Uint8Array,
  privateKeyBytes: Uint8Array,
  expiration: number,
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)).buffer);
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)).buffer);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key as ECDSA P-256
  const jwkKey = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(publicKeyBytes.slice(1, 33).buffer),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65).buffer),
    d: base64UrlEncode(privateKeyBytes.buffer),
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwkKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(unsignedToken),
  );

  // Convert DER signature to raw r||s format (each 32 bytes)
  const sigBytes = new Uint8Array(signature);
  const signatureB64 = base64UrlEncode(sigBytes.buffer);

  return `${unsignedToken}.${signatureB64}`;
}

async function hkdfSha256(
  salt: ArrayBuffer,
  ikm: ArrayBuffer,
  info: ArrayBuffer,
  length: number,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', key, salt.byteLength > 0 ? salt : new Uint8Array(32));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  // HKDF-Expand: single iteration since length <= 32
  const infoBytes = new Uint8Array(info);
  const expandInput = new Uint8Array(infoBytes.length + 1);
  expandInput.set(infoBytes);
  expandInput[infoBytes.length] = 1;
  const okm = await crypto.subtle.sign('HMAC', prkKey, expandInput);
  return okm.slice(0, length);
}

function createInfo(
  type: string,
  clientPublicKey: Uint8Array,
  serverPublicKey: Uint8Array,
): ArrayBuffer {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  // "Content-Encoding: <type>\0" + "P-256\0" + len(client) + client + len(server) + server
  const infoPrefix = encoder.encode('Content-Encoding: ');
  const nul = new Uint8Array([0]);
  const p256Label = encoder.encode('P-256');

  const clientLen = new Uint8Array(2);
  clientLen[0] = 0;
  clientLen[1] = clientPublicKey.length;

  const serverLen = new Uint8Array(2);
  serverLen[0] = 0;
  serverLen[1] = serverPublicKey.length;

  return concatBuffers(
    infoPrefix.buffer,
    typeBytes.buffer,
    nul.buffer,
    p256Label.buffer,
    nul.buffer,
    clientLen.buffer,
    clientPublicKey.buffer,
    serverLen.buffer,
    serverPublicKey.buffer,
  );
}

async function encryptPayload(
  clientPublicKeyBytes: Uint8Array,
  clientAuthSecret: Uint8Array,
  payload: string,
): Promise<{ ciphertext: ArrayBuffer; salt: Uint8Array; serverPublicKeyBytes: Uint8Array }> {
  // Generate a random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  // Export server public key
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeys.publicKey);
  const serverPublicKeyBytes = new Uint8Array(serverPublicKeyRaw);

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeys.privateKey,
    256,
  );

  // RFC 8291: IKM = HKDF-SHA-256(auth_secret, shared_secret, "WebPush: info\0" || client_public || server_public, 32)
  const encoder = new TextEncoder();
  const authInfo = concatBuffers(
    encoder.encode('WebPush: info\0').buffer,
    clientPublicKeyBytes.buffer,
    serverPublicKeyBytes.buffer,
  );
  const ikm = await hkdfSha256(clientAuthSecret.buffer, sharedSecret, authInfo, 32);

  // Derive content encryption key and nonce
  const cekInfo = createInfo('aes128gcm', clientPublicKeyBytes, serverPublicKeyBytes);
  const nonceInfo = createInfo('nonce', clientPublicKeyBytes, serverPublicKeyBytes);

  const contentEncryptionKey = await hkdfSha256(salt.buffer, ikm, cekInfo, 16);
  const nonce = await hkdfSha256(salt.buffer, ikm, nonceInfo, 12);

  // Pad the payload (add delimiter 0x02 and no padding for simplicity)
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    aesKey,
    paddedPayload,
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  const recordSize = 4096;
  rs[0] = (recordSize >> 24) & 0xff;
  rs[1] = (recordSize >> 16) & 0xff;
  rs[2] = (recordSize >> 8) & 0xff;
  rs[3] = recordSize & 0xff;

  const idLen = new Uint8Array([serverPublicKeyBytes.length]);

  const ciphertext = concatBuffers(
    salt.buffer,
    rs.buffer,
    idLen.buffer,
    serverPublicKeyBytes.buffer,
    encrypted,
  );

  return { ciphertext, salt, serverPublicKeyBytes };
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidEmail: string,
): Promise<Response> {
  const clientPublicKeyBytes = base64UrlDecode(subscription.keys.p256dh);
  const clientAuthSecret = base64UrlDecode(subscription.keys.auth);
  const vapidPublicKeyBytes = base64UrlDecode(vapidPublicKey);
  const vapidPrivateKeyBytes = base64UrlDecode(vapidPrivateKey);

  // Encrypt the payload
  const { ciphertext } = await encryptPayload(
    clientPublicKeyBytes,
    clientAuthSecret,
    payload,
  );

  // Create VAPID authorization
  const endpoint = new URL(subscription.endpoint);
  const audience = `${endpoint.protocol}//${endpoint.host}`;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const jwt = await createVapidJwt(
    audience,
    `mailto:${vapidEmail}`,
    vapidPublicKeyBytes,
    vapidPrivateKeyBytes,
    expiration,
  );

  const vapidKeyB64 = base64UrlEncode(vapidPublicKeyBytes.buffer);

  // Send the push message
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(ciphertext.byteLength),
      Authorization: `vapid t=${jwt}, k=${vapidKeyB64}`,
      TTL: '86400',
      Urgency: 'normal',
    },
    body: ciphertext,
  });

  return response;
}
