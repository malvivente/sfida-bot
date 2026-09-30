import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { Connect4State, Connect4Cell } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

const ROWS = 6;
const COLS = 7;

function createEmptyBoard(): Connect4Cell[][] {
  const board: Connect4Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(new Array(COLS).fill(0));
  }
  return board;
}

function checkWin(board: Connect4Cell[][]): { winnerCell: Connect4Cell; line: [number, number][] } | null {
  // 1. Horizontal check
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const cell = board[r][c];
      if (cell !== 0 && cell === board[r][c + 1] && cell === board[r][c + 2] && cell === board[r][c + 3]) {
        return {
          winnerCell: cell,
          line: [
            [r, c],
            [r, c + 1],
            [r, c + 2],
            [r, c + 3],
          ],
        };
      }
    }
  }

  // 2. Vertical check
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (cell !== 0 && cell === board[r + 1][c] && cell === board[r + 2][c] && cell === board[r + 3][c]) {
        return {
          winnerCell: cell,
          line: [
            [r, c],
            [r + 1, c],
            [r + 2, c],
            [r + 3, c],
          ],
        };
      }
    }
  }

  // 3. Diagonal Down-Right (\)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const cell = board[r][c];
      if (cell !== 0 && cell === board[r + 1][c + 1] && cell === board[r + 2][c + 2] && cell === board[r + 3][c + 3]) {
        return {
          winnerCell: cell,
          line: [
            [r, c],
            [r + 1, c + 1],
            [r + 2, c + 2],
            [r + 3, c + 3],
          ],
        };
      }
    }
  }

  // 4. Diagonal Up-Right (/)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const cell = board[r][c];
      if (cell !== 0 && cell === board[r - 1][c + 1] && cell === board[r - 2][c + 2] && cell === board[r - 3][c + 3]) {
        return {
          winnerCell: cell,
          line: [
            [r, c],
            [r - 1, c + 1],
            [r - 2, c + 2],
            [r - 3, c + 3],
          ],
        };
      }
    }
  }

  return null;
}

export class Connect4Room extends BaseGameRoom {
  public board: Connect4Cell[][] = createEmptyBoard();
  public currentTurn: 'A' | 'B' = 'A';
  public movesCount: number = 0;
  public lastMove?: Connect4State['lastMove'];
  public winningLine?: [number, number][];
  public isDraw: boolean = false;

  private turnTimeout?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'connect4', onSettled);
  }

  public getGamePayload(): Connect4State {
    return {
      board: this.board.map((row) => [...row]),
      currentTurn: this.currentTurn,
      movesCount: this.movesCount,
      lastMove: this.lastMove,
      winningLine: this.winningLine,
      isDraw: this.isDraw,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.board = createEmptyBoard();
    this.movesCount = 0;
    this.lastMove = undefined;
    this.winningLine = undefined;
    this.isDraw = false;

    // Coin toss for who drops first
    this.currentTurn = Math.random() < 0.5 ? 'A' : 'B';
    const activePlayerName = this.currentTurn === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    this.broadcast({
      type: 'CONNECT4_START',
      message: `🔴🔵 Forza 4 Board Ready! ${activePlayerName} has the first move. Align 4 to win!`,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private startTurnTimer() {
    if (this.turnTimeout) clearTimeout(this.turnTimeout);

    this.turnTimeout = setTimeout(() => {
      console.log(`[Connect4] Match #${this.matchId}: Player ${this.currentTurn} timed out. Auto-dropping into valid column.`);
      const activeWallet = this.currentTurn === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');

      // Pick first or random available column
      const availableCols: number[] = [];
      for (let c = 0; c < COLS; c++) {
        if (this.board[0][c] === 0) availableCols.push(c);
      }

      if (availableCols.length > 0) {
        const randomCol = availableCols[Math.floor(Math.random() * availableCols.length)];
        this.handleDrop(activeWallet, randomCol);
      }
    }, GAMES_CONFIG.connect4.turnTimeoutSeconds * 1000);
  }

  public handleGameAction(wallet: string, data: any) {
    if (this.state !== 'GAME_ACTIVE') return;

    if (data.type === 'CONNECT4_DROP') {
      const col = Number(data.column);
      if (isNaN(col) || col < 0 || col >= COLS) return;
      this.handleDrop(wallet, col);
    }
  }

  public handleDrop(wallet: string, column: number) {
    if (this.state !== 'GAME_ACTIVE') return;

    const isA = wallet.toLowerCase() === this.playerA.walletAddress.toLowerCase();
    const isB = this.playerB && wallet.toLowerCase() === this.playerB.walletAddress.toLowerCase();

    if (!isA && !isB) return;
    const actorSide = isA ? 'A' : 'B';

    if (this.currentTurn !== actorSide) {
      this.sendError(wallet, 'Not your turn!');
      return;
    }

    // Check if column is already full
    if (this.board[0][column] !== 0) {
      this.sendError(wallet, 'Column is full! Choose another column.');
      return;
    }

    // Find lowest available row
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r][column] === 0) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) return;

    // Drop chip
    const chipValue: Connect4Cell = actorSide === 'A' ? 1 : 2;
    this.board[targetRow][column] = chipValue;
    this.movesCount += 1;
    this.lastMove = {
      player: actorSide,
      row: targetRow,
      col: column,
    };

    const playerName = actorSide === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    // Check for win
    const winResult = checkWin(this.board);

    if (winResult) {
      if (this.turnTimeout) clearTimeout(this.turnTimeout);

      this.winningLine = winResult.line;
      const winnerWallet = actorSide === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      const winnerName = playerName;

      this.broadcast({
        type: 'CONNECT4_MOVE',
        message: `🎉 4 IN A ROW! ${winnerName} connected 4 chips and wins the duel!`,
        gameData: this.getGamePayload(),
      });

      setTimeout(() => {
        this.settleMatch(winnerWallet);
      }, 1200);
      return;
    }

    // Check for draw (board full: 42 moves)
    if (this.movesCount >= ROWS * COLS) {
      if (this.turnTimeout) clearTimeout(this.turnTimeout);

      this.isDraw = true;

      this.broadcast({
        type: 'CONNECT4_MOVE',
        message: `🤝 DRAW! The grid is completely full with no 4-in-a-row. Wagers refunded!`,
        gameData: this.getGamePayload(),
      });

      setTimeout(() => {
        this.settleDraw();
      }, 1000);
      return;
    }

    // Switch turn
    this.currentTurn = actorSide === 'A' ? 'B' : 'A';
    const nextPlayerName = this.currentTurn === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    this.broadcast({
      type: 'CONNECT4_MOVE',
      message: `${playerName} dropped chip into Col ${column + 1}. ${nextPlayerName}'s turn!`,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private async settleDraw() {
    this.state = 'MATCH_SETTLED';
    this.cleanupGameTimers();
    this.winnerAddress = undefined;
    this.winnerName = 'Nessun Vincitore (Pareggio)';

    const wagerNum = Number(this.config.wagerAmountNano) / 1e9;
    try {
      const { dbService } = await import('../services/db.js');
      await dbService.refundUserBalance(
        this.playerA.walletAddress,
        wagerNum.toFixed(2),
        `Draw refund in Connect 4 match #${this.matchId}`
      );
      if (this.playerB) {
        await dbService.refundUserBalance(
          this.playerB.walletAddress,
          wagerNum.toFixed(2),
          `Draw refund in Connect 4 match #${this.matchId}`
        );
      }
    } catch (err) {
      console.error('[Connect4] Error refunding draw wagers:', err);
    }

    this.broadcast({
      type: 'MATCH_SETTLED',
      winner: null,
      winnerName: 'Nessun Vincitore (Pareggio)',
      resolutionMessage: 'Partita conclusa in pareggio. Puntate rimborsate!',
      gameData: this.getGamePayload(),
    });
    this.broadcastRoomState();

    if (this.onMatchSettledCallback) {
      this.onMatchSettledCallback(this, '');
    }
  }

  public cleanupGameTimers() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }
  }

  public override resetForRematch() {
    this.cleanupGameTimers();
    this.board = createEmptyBoard();
    this.movesCount = 0;
    this.lastMove = undefined;
    this.winningLine = undefined;
    this.isDraw = false;
    this.currentTurn = Math.random() < 0.5 ? 'A' : 'B';
  }
}
