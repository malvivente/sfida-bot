# ⚔️ SfidaBot — Cyber Quickdraw Arena & Live Spectator Pari-Mutuel on TON

A production-ready, zero-house-risk 1v1 PvP Skill-Game Arena with Live Spectator Pari-Mutuel Betting, packaged as a Telegram Mini App (TMA) on the TON blockchain.

---

## 1. System Architecture

```
sfidabot/
├── contracts/                        # Tact contracts & Blueprint sandbox suite
│   ├── contracts/
│   │   ├── clash_master.tact         # Factory & Treasury receiver
│   │   ├── match_escrow.tact         # Match escrow & totalizer payout & self-destruct
│   │   ├── messages.tact             # Structs, OpCodes & Events
│   │   └── utils.tact                # Ed25519 signature checks & Math
│   ├── tests/
│   │   └── MatchEscrow.spec.ts       # 7 Sandbox unit test scenarios
│   ├── blueprint.config.ts
│   └── tact.config.json
├── server/                           # Backend + Game Server + Grammy Bot
│   ├── src/
│   │   ├── bot/                      # Grammy bot (inline query duel generator & deep links)
│   │   ├── engine/                   # Authoritative Quickdraw room & 8s forfeit timers
│   │   ├── ws/                       # Real-time WebSocket game & spectator feed
│   │   ├── services/                 # Ed25519 signer & TON settlement client
│   │   ├── routes/                   # REST API for match feed, profiles & affiliate stats
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma             # PostgreSQL ORM schema
│   └── tests/
│       └── QuickdrawRoom.spec.ts     # Engine & disconnect timeout tests
└── client/                           # Telegram Mini App (React + Vite + Tailwind)
    ├── src/
    │   ├── components/               # QuickdrawCanvas, SpectatorOddsBar, DuelLobby
    │   ├── hooks/                    # useTonClashContract, useSocket, useHaptics
    │   ├── pages/                    # Arena, MatchDetail, Profile, ReferralDashboard
    │   ├── App.tsx
    │   └── main.tsx
    ├── tonconnect-manifest.json
    └── tailwind.config.js
```

---

## 2. Financial & Tokenomics Engine

### 2.1 Match Creation Micro-Fee
- **0.02 TON** charged to the match creator to prevent network spam and subsidize server hot-wallet gas costs for settlement.

### 2.2 1v1 Player Pot
- Player A wager: $W$, Player B wager: $W$. Total Pot: $2W$.
- Total Rake: **4%** ($0.08W$).
- Player Winner Payout: **96%** ($1.92W$).
- Rake Allocation:
  - **70%** to Platform Treasury (2.8% of pot).
  - **30%** to Affiliate Pool (1.2% of pot).

### 2.3 Spectator Pari-Mutuel Pool (Zero-Risk Totalizer)
- Symmetrical pool: $S_A$ (bets on A) + $S_B$ (bets on B) = $S_{total}$.
- Total Rake: **6%** ($0.06 \times S_{total}$).
- Distributable Pool: **94%** ($0.94 \times S_{total}$).
- Winning payout multiplier: $M_W = \frac{S_{net}}{S_{winning\_side}}$.
- Rake Allocation:
  - **70%** to Platform Treasury (4.2% of pool).
  - **30%** to Affiliate Pool (1.8% of pool).

### 2.4 "Host vs Recruiter" Affiliate Split Logic (Max 30% of Rake)
For each fee event, the 30% affiliate allocation distributes as:
- **Case 1 (Recruiter + Group Match)**: Split 50/50 -> 15% to Recruiter, 15% to Group Admin.
- **Case 2 (Recruiter + Private Match)**: 30% to Recruiter.
- **Case 3 (No Recruiter + Group Match)**: 30% to Group Admin.
- **Case 4 (No Recruiter + Direct Match)**: 100% retained by Platform Treasury.

---

## 3. Gameplay Mechanics: "Cyber Quickdraw" (Anti-Cheat)
- **100% Authoritative Server Execution**: Client emits only timestamped tap events.
- **Format**: Best-of-3 rounds. First to 2 round wins takes the pot.
- **Randomized Trigger**: Server fires "FIRE!" with a randomized delay between **1,800ms and 4,200ms**.
- **Decoy "HOLD!" Signals & Misfire Protection**: Decoy "HOLD!" signals are fired intermittently. Any tap before the authentic "FIRE!" signal results in an instant round misfire penalty awarded to the opponent.
- **8-Second Disconnection & Rage-Quit Grace Timer**: If a player loses WebSocket connection, an 8-second countdown initiates. If the player fails to reconnect within 8 seconds, the match is automatically forfeited in favor of the opponent.
- **Sub-Millisecond Reaction Times**: Server measures reaction times down to fractional milliseconds and streams them live to duelists and spectators.

---

## 4. Running & Verification

### Install Dependencies
```bash
npm --prefix contracts install
npm --prefix server install
npm --prefix client install
```

### Run Smart Contract Sandbox Tests (Tact & Blueprint)
```bash
npm run test:contracts
```
*Validates 7 test scenarios: standard 1v1 payouts, spectator totalizer claims, 4-case affiliate splits, Ed25519 signature verification, anti-cheat forgery rejection, self-destruct cleanup, and factory deployments.*

### Run Authoritative Game Engine Tests
```bash
npm run test:server
```
*Validates Best-of-3 rounds, "HOLD!" decoy misfires, reaction time precision, 8s disconnect forfeit countdowns, and Pari-Mutuel odds math.*

### Build Frontend Telegram Mini App
```bash
npm run build:client
```

### Start Backend Game Server & Bot
```bash
npm run dev:server
```
*Listens on `http://localhost:3000` with WebSocket duel endpoint at `ws://localhost:3000/ws/duel`.*

### Start Frontend Mini App
```bash
npm run dev:client
```
*Runs at `http://localhost:5173`.*

---

## 5. Telegram Mini App & Bot Integration

- **Inline Duel Generation**: In any Telegram chat or group, type:
  `@sfidabot duel 5`
  Generates an interactive card with:
  - Match details, 5 TON stake, and live odds.
  - Buttons: **⚔️ Accept Challenge (5 TON)** and **👁️ Watch & Bet**.
- **Deep-Linking**: Direct links via `t.me/sfida_arena_bot?start=duel_<matchId>_<recruiterWallet>_<chatId>` attribute players to recruiters and group administrators.
