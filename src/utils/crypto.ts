import * as Crypto from 'expo-crypto';

const SALT_LENGTH = 16;
const HASH_ITERATIONS = 10000;

/**
 * Generate a random salt for password hashing
 */
const generateSalt = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(SALT_LENGTH);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Hash a password with PBKDF2-like approach using SHA-256
 * Format: salt:hash
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await generateSalt();

  // Create a salted password and hash it multiple times for security
  let hash = password + salt;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hash
    );
  }

  return `${salt}:${hash}`;
};

/**
 * Verify a password against a stored hash
 * @param password - The plain text password to verify
 * @param storedHash - The stored hash in format "salt:hash"
 * @returns true if password matches
 */
export const verifyPassword = async (
  password: string,
  storedHash: string
): Promise<boolean> => {
  const [salt, originalHash] = storedHash.split(':');

  if (!salt || !originalHash) {
    return false;
  }

  // Hash the provided password with the same salt
  let hash = password + salt;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hash
    );
  }

  return hash === originalHash;
};
