# MojoMan

Exercise-to-earn fitness app on Monad. Do pushups, squats, or jumping jacks on camera — AI counts your reps, you earn MOJO tokens, and viewers can bet on whether you hit your target.

## How It Works

1. **Exercise** — Pick an exercise and target reps. AI pose detection counts reps in real-time via your webcam.
2. **Stream** — Your session is live-streamed via WebRTC. Share a QR code so others can watch.
3. **Bet** — Viewers bet MON on whether you'll hit your target. Winners split the pool.
4. **Earn** — Complete reps to earn MOJO tokens (10 MOJO per rep, minted on-chain).
5. **Fight** — Level up your MojoFighter with exercise stats. Challenge other fighters with MON wagers.

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Blockchain**: Monad Testnet (EVM), Solidity 0.8.24, Hardhat
- **Wallet**: RainbowKit + wagmi + viem
- **AI**: TensorFlow.js MoveNet pose detection
- **Streaming**: PeerJS (WebRTC)
- **Database**: Supabase PostgreSQL + Prisma ORM
- **Deployment**: Vercel

## Project Structure

```
mojoman/
├── contracts/                  # Solidity smart contracts
│   ├── contracts/
│   │   ├── MojoToken.sol       # ERC20 token — minted as exercise rewards
│   │   ├── MojoSession.sol     # Exercise sessions + betting pool
│   │   └── MojoFighter.sol     # PvP fighter NFTs with stats
│   ├── scripts/deploy.ts       # Hardhat deployment script
│   └── hardhat.config.ts
│
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Home — active sessions + leaderboard
│   │   ├── exercise/           # Exercise session flow
│   │   ├── watch/[sessionId]/  # Live viewer + betting page
│   │   ├── arena/              # Fighter battles + agent panel
│   │   ├── fighter/[address]/  # Fighter profile
│   │   ├── leaderboard/        # Top fighters
│   │   └── api/                # API routes (sessions, fighters, indexer)
│   │
│   ├── components/
│   │   ├── ExerciseWalkthrough.tsx  # Animated 3-step intro before exercise
│   │   ├── ExercisePicker.tsx       # Exercise selection with difficulty/stats
│   │   ├── ExerciseCamera.tsx       # Webcam + TensorFlow pose detection
│   │   ├── RepCounter.tsx           # Live rep count display
│   │   ├── ShareSession.tsx         # QR code + copy link for sharing
│   │   ├── ViewerStream.tsx         # WebRTC video player for viewers
│   │   ├── ActivityFeed.tsx         # Live feed (reactions, bets, milestones)
│   │   ├── BettingPanel.tsx         # Bet up/down on exercise sessions
│   │   ├── FighterCard.tsx          # Fighter stats display
│   │   ├── BattleArena.tsx          # PvP battle visualization
│   │   ├── AgentPanel.tsx           # AI agent teaser (Coming Soon)
│   │   ├── Providers.tsx            # wagmi/RainbowKit/QueryClient providers
│   │   ├── Navbar.tsx               # Navigation
│   │   └── WalletButton.tsx         # Wallet connect button
│   │
│   ├── hooks/
│   │   ├── useExerciseCounter.ts    # Rep counting logic per exercise type
│   │   ├── usePoseDetection.ts      # TensorFlow MoveNet integration
│   │   ├── useWebRTC.ts             # PeerJS broadcaster + viewer hooks
│   │   ├── useSession.ts            # Create/resolve session contract calls
│   │   ├── useBetting.ts            # Place/claim bet contract calls
│   │   └── useFighter.ts            # Fighter CRUD + battle contract calls
│   │
│   ├── lib/
│   │   ├── contracts.ts         # Contract addresses + ABI config
│   │   ├── wagmiConfig.ts       # Chain + wallet config
│   │   ├── prisma.ts            # Database client
│   │   └── indexer.ts           # Blockchain event indexer
│   │
│   └── types/index.ts           # Shared TypeScript types
│
├── abis/                        # Contract ABIs (JSON)
├── prisma/schema.prisma         # Database schema
├── scripts/indexer.ts           # CLI indexer script
└── vercel.json                  # Vercel config + cron
```

## Contracts (Monad Testnet)

| Contract | Address |
|----------|---------|
| MojoToken | `0x216B8b81FEBeAa1873fB273b06799859B2F443DC` |
| MojoSession | `0x21758BC954072cE6f6Bd299bB99751BdD3BA9f24` |
| MojoFighter | `0xb006C666a25a7C3B6b3DC3F972D820472Dc98772` |

## Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Fill in your values (see Environment Variables below)

# Push database schema
npx prisma db push

# Run dev server
npm run dev
```

## Environment Variables

```env
# Contracts (deployed on Monad Testnet)
NEXT_PUBLIC_MOJO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_MOJO_SESSION_ADDRESS=0x...
NEXT_PUBLIC_MOJO_FIGHTER_ADDRESS=0x...

# Monad RPC
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# WalletConnect (https://cloud.reown.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Deployment (optional)
CRON_SECRET=random_secret_for_indexer
DEPLOYER_PRIVATE_KEY=0x... # Only needed for contract deployment
```

## Deploy

```bash
# Deploy to Vercel
vercel

# Set env vars in Vercel dashboard, then:
vercel --prod
```

The indexer runs via Vercel Cron (`/api/index`) — daily on Hobby plan, configurable on Pro.

## Contract Deployment

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network monadTestnet
```

Requires `DEPLOYER_PRIVATE_KEY` in `.env.local` with testnet MON for gas.
