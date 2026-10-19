# SfidaBot: Texas Hold'em Poker Design & Monetization Blueprint

Documento di specifiche e architettura per l'integrazione del gioco del **Texas Hold'em Poker** (Multiplayer) all'interno dell'ecosistema **SfidaBot / Sfida Arena** (Telegram Mini App, TON / GRAM).

---

## 1. Analisi Formato di Gioco e Partecipanti

### 1.1 Numero di Giocatori Consigliato: 2 - 5 Giocatori ("5-Max")
- **Minimo: 2 Giocatori (Heads-Up)**
  - Partite 1v1 ultra-rapide e competitive.
  - Si integrano perfettamente con il sistema di sfide dirette del bot Telegram (`/start duel_{id}` o invito privato).
- **Multiplayer Ideale: da 3 a 5 Giocatori (5-Max)**
  - **Perché 5-Max e non 9 (Full Ring)?**
    - **Ergonomia Mobile:** Sullo schermo verticale di uno smartphone (Telegram Mini App viewport ~390x700px), un tavolo a 5 posizioni permette di avere avatar leggibili, chip grandi e carte scoperte chiare. Un tavolo da 9 risulterebbe illeggibile.
    - **Ritmo e Retention:** Su mobile, i giocatori cercano azione continua. In 9 giocatori, il tempo tra una mano e l'altra è di 2-3 minuti con alto rischio di abbandono/AFK. In 5-Max, ogni giocatore gioca molte più mani, l'azione è dinamica e i tempi morti sono azzerati.

---

## 2. Modalità di Gioco

### A. Sit & Go (Torneo rapido a tavolo singolo - *Altamente Consigliato per lanciare il gioco*)
- **Funzionamento:**
  - 3 o 5 giocatori pagano un **Buy-in fisso in GRAM** (es. 5 GRAM, 10 GRAM, 25 GRAM).
  - Ciascun giocatore riceve lo stesso stack iniziale di fiches (es. 1.000 chips).
  - I bui (Small Blind / Big Blind) aumentano ogni 2 o 3 minuti (es. 10/20 $\to$ 20/40 $\to$ 50/100 $\to$ 100/200).
  - Chi perde tutte le chips viene eliminato.
  - La partita termina quando un giocatore ha tutte le fiches.
- **Payout:**
  - *Tavolo da 5:* 1° classificato 70% del montepremi, 2° classificato 30% del montepremi.
  - *Tavolo da 3:* Winner-Takes-All (100% al 1°).
- **Vantaggi operativi:**
  - Durata prevedibile (10-15 minuti).
  - Zero problemi di giocatori che entrano ed escono continuamente.
  - Zero rischio finanziario per la piattaforma.

### B. Cash Game (Tavolo aperto)
- I giocatori possono sedersi con un importo compreso tra il Min e Max Buy-in (es. da 5 a 50 GRAM).
- Le chips al tavolo rappresentano direttamente GRAM (es. 1 GRAM = 100 chip, con bui 1/2 chip).
- Un giocatore può alzarsi dal tavolo e convertire istantaneamente le chips rimanenti in saldo GRAM.

---

## 3. Modello di Monetizzazione (Come ci guadagna la piattaforma)

Nel Poker **la piattaforma funge solo da intermediario neutrale (banco neutrale)**, quindi il guadagno è costante, garantito e **a rischio zero**:

### 1. Tournament Fee / Rake d'Iscrizione nei Sit & Go
- Ogni torneo ha una quota espressa nella formula **Buy-in + Fee** (es. 8% - 10% di trattenuta):
  - Esempio Sit & Go da 5 giocatori a 10 GRAM:
    - Costo iscrizione: **10 GRAM + 1 GRAM fee** (Totale 11 GRAM pagati).
    - Montepremi distribuito ai giocatori: $10 \times 5 = \mathbf{50\text{ GRAM}}$.
    - **Incasso netto della piattaforma:** $1 \times 5 = \mathbf{5\text{ GRAM}}$ garantiti all'avvio del torneo.

### 2. Rake sul Piatto (Cash Game)
- Standard dei migliori casino e poker room internazionali:
  - Trattenuta del **3% - 5%** su ciascun piatto assegnato.
  - **Regola "No Flop, No Drop":** Se la mano termina prima del Flop (tutti foldano pre-flop), la casa non preleva alcuna fee. Questo incentiva i giocatori e assicura correttezza etica.
  - **Rake Cap:** Un tetto massimo di prelievo per mano (es. max 0.50 GRAM a mano) per non penalizzare i piatti molto grandi.

### 3. Bad Beat / Jackpot High Hand (Fidelizzazione)
- Una micro-fee opzionale (es. 0.5% del piatto o 0.20 GRAM a torneo) va ad alimentare il **Sfida Trust Jackpot**.
- Se un giocatore perde una mano pur avendo una combinazione eccezionale (es. Poker d'Assi battuto da Scala Colore) o centra una Scala Reale, scatta il Jackpot condiviso.

### 4. Affiliazione e Revenue Sharing per Canali/Gruppi Telegram
- Quando un tavolo o torneo viene lanciato all'interno di una community Telegram, il proprietario del gruppo riceve una quota fissa delle fee generate da quel tavolo (es. 25% del rake della piattaforma).
- Questo stimola i titolari di canali Telegram crypto/gaming a organizzare tornei giornalieri sul proprio canale, portando migliaia di utenti organici.

---

## 4. Architettura Tecnica e Meccanica

```
┌────────────────────────────────────────────────────────┐
│                   Telegram Mini App                    │
│   Tavolo Cyber Neon 5-Max · Avatar TG · Slider Bet     │
└──────────────────────────┬─────────────────────────────┘
                           │ WebSocket Criptato (ws/duel)
┌──────────────────────────▼─────────────────────────────┐
│                    PokerRoom.ts                        │
│   State Machine · Gestione Pot/Side-Pot · Action Clock │
├────────────────────────────────────────────────────────┤
│   - Dealer / Small Blind / Big Blind rotation          │
│   - Round di puntata: Pre-Flop, Flop, Turn, River      │
│   - Azioni: Fold, Check, Call, Bet, Raise, All-In      │
└──────────┬─────────────────────────────────┬───────────┘
           │                                 │
┌──────────▼───────────┐         ┌───────────▼───────────┐
│     Anti-Cheat       │         │  7-Card Hand Evaluator│
│ Carte private inviate│         │  Bitwise / TwoPlusTwo │
│  solo al proprietario│         │  Valutazione vincitore│
└──────────────────────┘         └───────────────────────┘
```

### Componenti Chiave:
1. **Sicurezza & Zero-Knowledge Hole Cards:**
   - Il server mescola il mazzo (52 carte standard) a inizio mano con seed crittografico.
   - Le due carte coperte di ogni giocatore vengono trasmesse via WebSocket **esclusivamente al websocket del rispettivo giocatore**.
   - Gli avversari e gli spettatori ricevono solo l'evento `{ type: 'PLAYER_DEALT', seatIndex }`.
   - Nessun client (nemmeno ispezionando i pacchetti di rete) può vedere le carte altrui prima dello Showdown.
2. **Action Clock & Disconnection Protection:**
   - Timer per decisione di **15 secondi** a turno, con animazione barra circolare attorno all'avatar del giocatore attivo.
   - Se un giocatore scade il tempo: se può fare Check fa Check, altrimenti scatta il Fold automatico. Questo garantisce che nessun giocatore AFK blocchi il tavolo.
3. **Gestione Side-Pots:**
   - Calcolo automatico dei piatti secondari quando uno o più giocatori vanno All-In con stack inferiori agli altri.
4. **Interfaccia Grafica (UI/UX):**
   - Tavolo da poker Cyber Neon in vista dall'alto / prospettiva ellittica.
   - 5 postazioni giocatori con avatar Telegram, chip stack, carte private animate.
   - Centro tavolo: Piatto corrente (Total Pot), carte comuni (Flop a 3 carte, Turn, River) con animazione di flip.
   - Controlli touch: Fold (Rosso), Check/Call (Verde), Raise (Ciano/Oro) con slider touch e pulsanti rapidi (`Min`, `2.5x`, `1/2 Pot`, `Pot`, `All-in`).
