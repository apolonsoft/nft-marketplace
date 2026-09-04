export type Address = `0x${string}`;
export type ChainId = 31337 | 84532;

export interface ContractDeployment {
  readonly address: Address;
  readonly implementation?: Address;
  readonly deployedAtBlock?: bigint;
  readonly transactionHash?: `0x${string}`;
}

export interface NetworkManifest {
  readonly chainId: ChainId;
  readonly name: string;
  readonly rpcUrl?: string;
  readonly contracts: Record<string, ContractDeployment>;
  readonly config: {
    readonly multisig: Address;
    readonly treasury: Address;
    readonly usdc?: Address;
    readonly platformFeeBps: number;
  };
}
