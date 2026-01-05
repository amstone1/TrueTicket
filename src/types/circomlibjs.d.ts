declare module 'circomlibjs' {
  export interface PoseidonF {
    toObject(v: Uint8Array): bigint;
    toString(v: Uint8Array, radix?: number): string;
    e(v: bigint | number | string): bigint;
    zero: bigint;
    one: bigint;
  }

  export interface Poseidon {
    (inputs: (bigint | Uint8Array)[]): Uint8Array;
    F: PoseidonF;
  }

  export function buildPoseidon(): Promise<Poseidon>;
  export function buildBabyjub(): Promise<unknown>;
  export function buildEddsa(): Promise<unknown>;
  export function buildMimc7(): Promise<unknown>;
  export function buildMimcSponge(): Promise<unknown>;
  export function buildPedersenHash(): Promise<unknown>;
  export function buildSMT(db: unknown, root: unknown): Promise<unknown>;
}
