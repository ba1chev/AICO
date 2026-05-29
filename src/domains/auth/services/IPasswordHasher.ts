export interface HashedPassword {
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
}

export interface IPasswordHasher {
  hash(plaintext: string): Promise<HashedPassword>;
  verify(plaintext: string, expected: HashedPassword): Promise<boolean>;
}
