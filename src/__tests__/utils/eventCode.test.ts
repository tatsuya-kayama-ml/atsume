// Test for event code generation logic (extracted from eventStore)

// Generate 6-character alphanumeric code (same logic as in eventStore)
const generateEventCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

describe('Event Code Generation', () => {
  it('should generate a 6-character code', () => {
    const code = generateEventCode();
    expect(code.length).toBe(6);
  });

  it('should only contain allowed characters', () => {
    const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < 100; i++) {
      const code = generateEventCode();
      for (const char of code) {
        expect(allowedChars).toContain(char);
      }
    }
  });

  it('should not contain confusing characters (I, O, 0, 1)', () => {
    const confusingChars = ['I', 'O', '0', '1'];

    for (let i = 0; i < 100; i++) {
      const code = generateEventCode();
      for (const confusingChar of confusingChars) {
        expect(code).not.toContain(confusingChar);
      }
    }
  });

  it('should generate unique codes (with high probability)', () => {
    const codes = new Set<string>();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      codes.add(generateEventCode());
    }

    // With 32^6 = ~1 billion possible codes, 1000 iterations should have no collisions
    expect(codes.size).toBe(iterations);
  });

  it('should generate uppercase codes only', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateEventCode();
      expect(code).toBe(code.toUpperCase());
    }
  });
});

describe('Event Code Format', () => {
  it('should be readable and easy to share', () => {
    const code = generateEventCode();

    // Should be alphanumeric only
    expect(code).toMatch(/^[A-Z0-9]+$/);

    // Should be short enough to remember/type
    expect(code.length).toBeLessThanOrEqual(8);
    expect(code.length).toBeGreaterThanOrEqual(4);
  });
});
