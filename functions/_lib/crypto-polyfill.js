// Patch node:crypto to make AES-ECB with null iv work in Workers.
// Workers' node:crypto polyfill rejects iv=null, but ECB mode legitimately
// has no iv. Convert null/undefined iv to an empty Buffer.
import crypto from 'node:crypto';

const originalCreateCipheriv = crypto.createCipheriv;
const originalCreateDecipheriv = crypto.createDecipheriv;

/**
 * @param {unknown} iv
 * @returns {Buffer | null}
 */
function normalizeIv(iv) {
  if (iv === null || iv === undefined) {
    return Buffer.alloc(0);
  }
  return iv;
}

crypto.createCipheriv = function (cipher, key, iv, options) {
  return originalCreateCipheriv.call(
    crypto,
    cipher,
    key,
    normalizeIv(iv),
    options
  );
};

crypto.createDecipheriv = function (cipher, key, iv, options) {
  return originalCreateDecipheriv.call(
    crypto,
    cipher,
    key,
    normalizeIv(iv),
    options
  );
};

export default crypto;
