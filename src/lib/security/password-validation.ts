/**
 * Password Validation and Security Utilities
 */
import { randomInt } from "crypto";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

/**
 * Common passwords to blacklist
 */
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
  'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
  'shadow', '123123', '654321', 'superman', 'qazwsx', 'michael',
  'football', 'admin', 'welcome', 'login', 'test', 'user'
]);

/**
 * Validate password strength and requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  } else {
    score += 1;
    if (password.length >= 16) score += 1;
    if (password.length >= 20) score += 1;
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Common password check
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more unique password');
    score = 0;
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., "aaa", "111")');
    score -= 1;
  }

  // Sequential patterns check
  if (
    /012|123|234|345|456|567|678|789|890/.test(password) ||
    /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)
  ) {
    errors.push('Password should not contain sequential patterns');
    score -= 1;
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'medium';
  } else if (score <= 6) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.max(0, score),
  };
}

/**
 * Check if password has been compromised (basic check)
 * In production, integrate with Have I Been Pwned API
 */
export async function checkPasswordCompromised(password: string): Promise<boolean> {
  // For now, just check against common passwords
  // TODO: Integrate with Have I Been Pwned API
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Generate a strong random password
 */
export function generateStrongPassword(length: number = 16): string {
  if (!Number.isInteger(length) || length < 4) {
    throw new Error("Password length must be an integer of at least 4 characters");
  }

  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = uppercase + lowercase + numbers + special;

  const pickRandomChar = (chars: string): string => chars[randomInt(chars.length)];

  const passwordChars: string[] = [
    pickRandomChar(uppercase),
    pickRandomChar(lowercase),
    pickRandomChar(numbers),
    pickRandomChar(special),
  ];

  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(pickRandomChar(allChars));
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}

/**
 * Calculate password entropy (bits)
 */
export function calculatePasswordEntropy(password: string): number {
  let charsetSize = 0;
  
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;
  
  return Math.log2(Math.pow(charsetSize, password.length));
}
