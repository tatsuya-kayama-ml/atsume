import { z } from 'zod';

// Re-create the schemas for testing (from SignUpScreen)
const signUpSchema = z
  .object({
    displayName: z
      .string()
      .min(1, '表示名を入力してください')
      .max(10, '表示名は10文字以内で入力してください')
      .regex(/^[a-zA-Z0-9ぁ-んァ-ヶー一-龯々]+$/, '絵文字や記号は使用できません'),
    email: z
      .string()
      .min(1, 'メールアドレスを入力してください')
      .email('有効なメールアドレスを入力してください'),
    password: z
      .string()
      .min(1, 'パスワードを入力してください')
      .min(6, 'パスワードは6文字以上で入力してください'),
    confirmPassword: z.string().min(1, 'パスワード（確認）を入力してください'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

describe('SignUp Validation Schema', () => {
  describe('displayName', () => {
    it('should reject empty display name', () => {
      const result = signUpSchema.safeParse({
        displayName: '',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('表示名を入力してください');
      }
    });

    it('should reject display name over 10 characters', () => {
      const result = signUpSchema.safeParse({
        displayName: 'a'.repeat(11),
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('表示名は10文字以内で入力してください');
      }
    });

    it('should reject display name with emoji or symbols', () => {
      const result = signUpSchema.safeParse({
        displayName: '田中太郎🎉',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('絵文字や記号は使用できません');
      }
    });

    it('should accept valid display name', () => {
      const result = signUpSchema.safeParse({
        displayName: '山田太郎',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('email', () => {
    it('should reject empty email', () => {
      const result = signUpSchema.safeParse({
        displayName: 'テスト',
        email: '',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('メールアドレスを入力してください');
      }
    });

    it('should reject invalid email format', () => {
      const result = signUpSchema.safeParse({
        displayName: 'テスト',
        email: 'invalid-email',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('有効なメールアドレスを入力してください');
      }
    });

    it('should accept valid email', () => {
      const result = signUpSchema.safeParse({
        displayName: 'テスト',
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('password', () => {
    it('should reject empty password', () => {
      const result = signUpSchema.safeParse({
        displayName: 'テスト',
        email: 'test@example.com',
        password: '',
        confirmPassword: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.issues.find(i => i.path[0] === 'password');
        expect(passwordError?.message).toBe('パスワードを入力してください');
      }
    });

    it('should reject password under 6 characters', () => {
      const result = signUpSchema.safeParse({
        displayName: 'テスト',
        email: 'test@example.com',
        password: '12345',
        confirmPassword: '12345',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.issues.find(i => i.path[0] === 'password');
        expect(passwordError?.message).toBe('パスワードは6文字以上で入力してください');
      }
    });

    it('should accept password with 6 or more characters', () => {
      const result = signUpSchema.safeParse({
        displayName: 'テスト',
        email: 'test@example.com',
        password: '123456',
        confirmPassword: '123456',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('confirmPassword', () => {
    it('should reject when passwords do not match', () => {
      const result = signUpSchema.safeParse({
        displayName: 'テスト',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'differentPassword',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find(i => i.path[0] === 'confirmPassword');
        expect(confirmError?.message).toBe('パスワードが一致しません');
      }
    });

    it('should accept when passwords match', () => {
      const result = signUpSchema.safeParse({
        displayName: 'テスト',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('complete form validation', () => {
    it('should accept valid form data', () => {
      const result = signUpSchema.safeParse({
        displayName: '山田太郎',
        email: 'yamada@example.com',
        password: 'securePass123',
        confirmPassword: 'securePass123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('山田太郎');
        expect(result.data.email).toBe('yamada@example.com');
      }
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const result = signUpSchema.safeParse({
        displayName: '',
        email: 'invalid',
        password: '123',
        confirmPassword: '456',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });
});
