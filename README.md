# MojoMan - Exercise-to-Earn on Monad

**Live App:** [mojoman.vercel.app](https://mojoman.vercel.app)
**Network:** Monad Testnet (Chain ID: 10143)

---

## What is MojoMan?

MojoMan is a real-time exercise-to-earn platform built on Monad. Users perform exercises on camera — AI pose detection counts reps automatically — while spectators watch the live stream and bet MON on whether the exerciser hits their target. Every session is recorded on-chain, every bet is settled trustlessly, and completed workouts train an on-chain Fighter that can battle other players.

**The core loop:**
1. You exercise on camera. AI counts your reps.
2. Spectators watch your live stream and bet on your performance.
3. You earn MOJO tokens. Your fighter gets stronger.
4. Challenge other fighters to battles with MON wagers.

---

## Demo Flow

### For the Exerciser
1. Connect wallet (MetaMask on Monad Testnet)
2. Pick exercise type (Pushups / Squats / Jumping Jacks) and set a target
3. Click "Unleash the Mojo" — signs an on-chain `createSession` transaction
4. Camera activates, AI pose detection starts tracking your body
5. Do your reps — the counter updates in real-time
6. QR code appears — share it so spectators can watch and bet
7. Click "Stop & Submit" — resolves the session on-chain with your actual rep count
8. Stats are saved to the leaderboard immediately

### For the Spectator
1. Scan the QR code or visit the watch link
2. See the exerciser's live camera feed via WebRTC
3. See the live rep counter with progress bar
4. Place a bet: "They make it" or "They miss" with MON
5. Watch milestones (25%, 50%, 75%, 100%) tracked in the activity feed
6. Send reactions in real-time
7. If your bet wins, claim your share of the pool

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER (Next.js)                     │
│                                                          │
│  TensorFlow.js MoveNet ──► 17 keypoints @ 30fps         │
│  Angle calculation ──────► Rep counting state machine    │
│  PeerJS WebRTC ──────────► P2P video to spectators       │
│  Wagmi + Viem ───────────► On-chain transactions         │
└──────────────┬──────────────┬──────────────┬─────────────┘
               │              │              │
    ┌──────────▼──────┐  ┌───▼────┐  ┌──────▼──────────┐
    │  Monad Testnet  │  │Railway │  │    Supabase      │
    │                 │  │        │  │                  │
    │  MojoSession    │  │PeerJS  │  │  PostgreSQL      │
    │  MojoFighter    │  │Signal  │  │  + Prisma ORM    │
    │  MojoToken      │  │Server  │  │  + Event Indexer │
    └─────────────────┘  └────────┘  └──────────────────┘
```

### Data Flow

1. **Exercise Detection:** Camera → TensorFlow.js MoveNet → 17 body keypoints → angle calculation → phase detection (up/down) → rep counter (3 stable frames + 600ms debounce)

2. **On-Chain:** `createSession()` → exercise → `resolveSession(actualReps)` → MOJO minted per rep → `syncStats()` to train Fighter

3. **Live Streaming:** Camera → PeerJS broadcaster → Railway signaling server → PeerJS viewer → WebRTC P2P video + data channels (rep updates, reactions, bet events)

4. **Betting:** Spectator calls `placeBet(sessionId, isUp)` with MON → pool accumulates → session resolves → winners call `claimBet(sessionId)` for proportional payout

5. **Leaderboard:** Session completion → POST /api/sessions → upsert Fighter stats → leaderboard queries sorted by totalReps / level / wins

---

## Smart Contracts (Monad Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **MojoSession** | `0x21758BC954072cE6f6Bd299bB99751BdD3BA9f24` | Exercise sessions + binary betting pools |
| **MojoFighter** | `0xb006C666a25a7C3B6b3DC3F972D820472Dc98772` | Fighter stats, PvP challenges, battles |
| **MojoToken** | `0x216B8b81FEBeAa1873fB273b06799859B2F443DC` | MOJO ERC20 token (10 per rep) |

### MojoSession

```solidity
createSession(uint8 exerciseType, uint256 targetReps) → uint256 sessionId
placeBet(uint256 sessionId, bool isUp) payable        // Bet MON on outcome
resolveSession(uint256 sessionId, uint256 actualReps)  // Submit results
claimBet(uint256 sessionId)                            // Winners claim payout
```

- Binary prediction market: "Makes it" vs "Misses"
- Proportional payout from the losing pool to winners
- Session timeout protection

### MojoFighter

```solidity
createFighter()                                        // Mint a fighter
syncStats(uint256 sessionId)                           // Train from session
challenge(address opponent) payable → uint256           // Challenge with wager
acceptChallenge(uint256 challengeId) payable           // Match the wager
resolveBattle(uint256 challengeId)                     // Resolve by stats
```

- Pushups → Strength, Squats → Endurance, Jumping Jacks → Agility
- Level = totalReps / 10
- Battle resolution based on combined stats

### MojoToken

```solidity
mint(address to, uint256 amount)                       // Authorized minters only
```

- 10 MOJO per rep completed
- Minted on session resolution

---

## Exercise Detection (AI)

MojoMan uses **TensorFlow.js MoveNet SINGLEPOSE_LIGHTNING** for real-time pose detection:

- **17 body keypoints** detected per frame (nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles)
- **WebGL backend** with automatic CPU fallback
- **~30fps** detection loop via requestAnimationFrame

### Rep Counting Algorithm

Each exercise uses specific joint angles to detect phases:

| Exercise | Keypoints Used | Down Phase | Up Phase |
|----------|---------------|------------|----------|
| **Pushups** | shoulder-elbow-wrist | Elbow angle < 120 degrees | Elbow angle > 145 degrees |
| **Squats** | hip-knee-ankle | Knee angle < 130 degrees | Knee angle > 155 degrees |
| **Jumping Jacks** | hip-shoulder-wrist + ankle spread | Arms down (<70 deg) or legs together | Arms up (>120 deg) or legs apart |

**Anti-cheat measures:**
- 3 consecutive stable frames required before phase transition
- 600ms minimum interval between reps
- Uses whichever side of the body has higher confidence scores
- Averages both sides when both are visible

---

## Live Streaming

WebRTC peer-to-peer streaming via PeerJS:

- **Broadcaster** (exerciser) registers as `mojo-session-{sessionId}` on the signaling server
- **Viewers** connect to the same peer ID to receive the video stream
- **Data channels** carry rep updates, reactions, and bet notifications in real-time
- **No media server** — video goes directly between browsers
- **STUN servers** (Google) for NAT traversal
- **Auto-retry** — viewers retry up to 10 times if the broadcaster isn't ready

### Signaling Server

A standalone PeerJS server deployed on Railway handles WebRTC signaling:

```js
const { PeerServer } = require("peer");
PeerServer({ port: process.env.PORT, path: "/myapp", corsOptions: { origin: "*" } });
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | SSR, API routes, static optimization |
| **UI** | React 19 + Tailwind CSS | Glass-morphism design system |
| **Pose Detection** | TensorFlow.js + MoveNet | Client-side, no server needed, ~30fps |
| **Live Streaming** | PeerJS (WebRTC) | P2P, low latency, no media server cost |
| **Blockchain** | Monad Testnet | Fast finality, EVM compatible |
| **Web3** | Wagmi v2 + Viem + RainbowKit | Type-safe contract interactions |
| **Database** | PostgreSQL (Supabase) + Prisma | Immediate leaderboard updates |
| **Signaling** | PeerJS Server on Railway | WebRTC connection brokering |
| **Deployment** | Vercel + Railway | Auto-deploy from GitHub |

---

## Project Structure

```
src/
  app/
    page.tsx                        # Home — hero, live challenges, top movers
    exercise/page.tsx               # Full exercise flow with on-chain session
    watch/[sessionId]/page.tsx      # Spectator view — stream + betting
    arena/page.tsx                  # Fighter management + challenges
    leaderboard/page.tsx            # Sortable rankings
    fighter/[address]/page.tsx      # Fighter profile
    api/
      sessions/route.ts             # GET sessions + POST immediate save
      leaderboard/route.ts          # Ranked fighter query
      fighters/[address]/route.ts   # Fighter profile API
      challenges/route.ts           # Active challenges
      index/route.ts                # Blockchain indexer cron endpoint
  components/
    ExerciseCamera.tsx              # Webcam + skeleton overlay
    ExerciseWalkthrough.tsx         # Animated 3-step pre-exercise intro
    ExercisePicker.tsx              # Exercise + target selection
    RepCounter.tsx                  # Live rep display with progress
    BettingPanel.tsx                # Up/down bet placement + claim
    ViewerStream.tsx                # Remote video player (LIVE badge)
    ActivityFeed.tsx                # Real-time event feed with reactions
    ShareSession.tsx                # QR code generation
    FighterCard.tsx                 # Fighter stats visualization
    BattleArena.tsx                 # Challenge/battle UI
    AgentPanel.tsx                  # AI agent panel
  hooks/
    usePoseDetection.ts             # TF.js model lifecycle + detection loop
    useExerciseCounter.ts           # Rep counting state machine
    useSession.ts                   # createSession + resolveSession (wagmi)
    useBetting.ts                   # placeBet + claimBet (wagmi)
    useFighter.ts                   # Fighter CRUD + battle hooks (wagmi)
    useWebRTC.ts                    # Broadcaster + viewer with retry logic
  lib/
    exercises.ts                    # Per-exercise angle detection algorithms
    poseUtils.ts                    # Angle math, skeleton drawing
    contracts.ts                    # Contract address + ABI config
    wagmiConfig.ts                  # Monad chain + RainbowKit config
    prisma.ts                       # Database client (singleton)
    indexer.ts                      # Blockchain event → DB sync
abis/
  MojoSession.json                  # Session contract ABI (JSON)
  MojoFighter.json                  # Fighter contract ABI (JSON)
  MojoToken.json                    # Token contract ABI (JSON)
peer-server/
  index.js                          # Standalone PeerJS signaling server
  package.json
prisma/
  schema.prisma                     # Session, Bet, Fighter, Challenge models
```

---

## Setup

```bash
# Clone the repo
git clone https://github.com/AnthonyKobzar27/mojoman-monad-denver.git
cd mojoman-monad-denver

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in your values (see below)

# Generate Prisma client + push schema
npx prisma generate
npx prisma db push

# Start the PeerJS signaling server (separate terminal)
node peerserver.js

# Start the dev server
npm run dev
```

## Environment Variables

```env
# Smart Contracts (Monad Testnet)
NEXT_PUBLIC_MOJO_TOKEN_ADDRESS=0x216B8b81FEBeAa1873fB273b06799859B2F443DC
NEXT_PUBLIC_MOJO_SESSION_ADDRESS=0x21758BC954072cE6f6Bd299bB99751BdD3BA9f24
NEXT_PUBLIC_MOJO_FIGHTER_ADDRESS=0xb006C666a25a7C3B6b3DC3F972D820472Dc98772

# Monad RPC
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# PeerJS Signaling Server
NEXT_PUBLIC_PEER_SERVER_URL=https://your-peer-server.up.railway.app

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| App | Vercel | Auto-deploys from `main`, set env vars in dashboard |
| PeerJS Server | Railway | Deploy from `peer-server/` directory, generate public domain |
| Database | Supabase | PostgreSQL with Prisma ORM |
| Contracts | Monad Testnet | Deployed via Hardhat |

---

## Why Monad?

MojoMan needs fast, cheap transactions for a seamless UX:

- **Session creation** happens right before exercising — users can't wait 12 seconds for a block
- **Bets are placed during a live session** — spectators need instant confirmation
- **Session resolution** happens right after the workout — the user is standing there sweating
- **MOJO minting** should be invisible — no gas anxiety for a fitness app

Monad's high throughput and fast finality make all of this feel instant. The exerciser signs one tx, starts working out, and by the time they're done, their session is confirmed and spectators have already placed bets.

---

## Team

- **Anthony Kobzar**
- **Ezra Tramble**

Built at **ETHDenver 2026** on Monad.
