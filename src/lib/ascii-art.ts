export const ASCII_LOGO = `
 _____  _____               __ ___         _
|_  / |/ / _ \\_ _ ___  ___ / _| _ \\___ _ _| |_
 / /| ' <|  _/ '_/ _ \\/ _ \\  _|  _/ _ \\ '_|  _|
/___|_|\\_\\_| |_| \\___/\\___/_| |_| \\___/_|  \\__|
`;

export const ASCII_DIVIDER = '═══════════════════════════════════════════════════════════════';
export const ASCII_THIN_DIVIDER = '───────────────────────────────────────────────────────────────';

export const ASCII_ZK = `
  ┌──────────────────────────────────────────────┐
  │  Z E R O - K N O W L E D G E   P R O O F S  │
  └──────────────────────────────────────────────┘
`;

export const ASCII_ARCHITECTURE = `
  ┌─────────────────────────────────────────────────────────────┐
  │                    ZKProofport Architecture                  │
  ├─────────────────────────────────────────────────────────────┤
  │                                                             │
  │   dApp / Website                                            │
  │   ┌──────────────┐     ┌──────────────┐                    │
  │   │ TypeScript   │────▶│  WebSocket   │                    │
  │   │ SDK          │     │  Relay       │                    │
  │   └──────────────┘     └──────┬───────┘                    │
  │                               │                             │
  │                       ┌───────▼───────┐                    │
  │                       │ Mobile App    │                    │
  │                       │ (React Native)│                    │
  │                       └───────┬───────┘                    │
  │                               │                             │
  │                       ┌───────▼───────┐                    │
  │                       │ mopro (Rust)  │                    │
  │                       │ ZK Prover     │                    │
  │                       └───────┬───────┘                    │
  │                               │                             │
  │   ┌──────────────┐    ┌──────▼───────┐                    │
  │   │ Noir Circuit │───▶│ Barretenberg │                    │
  │   │ (*.nr)       │    │ (bb backend) │                    │
  │   └──────────────┘    └──────┬───────┘                    │
  │                               │                             │
  │                       ┌───────▼───────┐                    │
  │                       │ Base L2 (EVM) │                    │
  │                       │ On-Chain      │                    │
  │                       │ Verification  │                    │
  │                       └───────────────┘                    │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
`;

export const ASCII_STACK = `
  Layer 7  │  TypeScript SDK         npm install @proofport/sdk
  Layer 6  │  WebSocket Relay        Real-time proof status
  Layer 5  │  React Native App       iOS + Android
  Layer 4  │  mopro (Rust FFI)       Mobile proof generation
  Layer 3  │  Barretenberg           Proving backend
  Layer 2  │  Noir Circuits          Zero-knowledge programs
  Layer 1  │  Base L2 (EVM)          On-chain verification
  Layer 0  │  Ethereum               Security inheritance
`;
