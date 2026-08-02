import { createHash } from "node:crypto";

export interface SeededRandom {
  next(input: string): number;
}

export class HashSeededRandom implements SeededRandom {
  constructor(private readonly seed: string) {}

  next(input: string): number {
    const hash = createHash("sha256")
      .update(this.seed)
      .update(":")
      .update(input)
      .digest();
    const value = hash.readUInt32BE(0);

    return value / 0xffffffff;
  }
}
