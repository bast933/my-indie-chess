import { Chess } from 'chess.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { config } from './config.js';

class GameManager {
  constructor() {
    this.games = new Map(); // roomCode -> game state
  }

  initGame(roomCode, timeControl = null) {
    const tc = timeControl || config.defaultTimeControl;
    
    const game = {
      chess: new Chess(),
      moves: [],
      startTime: null,
      lastMoveTime: null,
      clocks: {
        white: tc.initial,
        black: tc.initial
      },
      timeControl: tc,
      isBilateral: !!(tc && tc.bilateral),
      clockSwitches: {
        white: false,
        black: false
      },
      clockInterval: null,
      onTimeout: null,
      isStarted: false,
      isPaused: false,
      isEnded: false,
      result: null,
      whiteName: null,
      blackName: null
    };

    this.games.set(roomCode, game);
    return game;
  }

  getGame(roomCode) {
    return this.games.get(roomCode);
  }

  isClockRunning(game) {
    if (!game || !game.isStarted || game.isEnded || game.isPaused) return false;
    // Bilateral logic: se entrambi i giocatori sono su ON il tempo si ferma, negli altri 3 casi il tempo scorre
    if (game.isBilateral && game.clockSwitches?.white && game.clockSwitches?.black) {
      return false;
    }
    return Boolean(game.timeControl && game.timeControl.initial > 0);
  }

  startClockTimer(roomCode) {
    const game = this.games.get(roomCode);
    if (!game || !this.isClockRunning(game)) return;

    if (game.clockInterval) {
      clearInterval(game.clockInterval);
    }

    game.clockInterval = setInterval(() => {
      const g = this.games.get(roomCode);
      if (!g || !this.isClockRunning(g)) {
        return;
      }

      const turn = g.chess.turn() === 'w' ? 'white' : 'black';
      const elapsed = Date.now() - (g.lastMoveTime || Date.now());
      const remaining = g.clocks[turn] - elapsed;

      if (remaining <= 0) {
        // Flag fell! Timeout
        this.stopClockTimer(roomCode);
        g.clocks[turn] = 0;
        g.isEnded = true;
        const winner = turn === 'white' ? 'black' : 'white';
        g.result = {
          winner,
          reason: 'timeout'
        };

        if (typeof g.onTimeout === 'function') {
          g.onTimeout(roomCode, g.result, this.getClocks(roomCode));
        }
      }
    }, 500);
  }

  stopClockTimer(roomCode) {
    const game = this.games.get(roomCode);
    if (game && game.clockInterval) {
      clearInterval(game.clockInterval);
      game.clockInterval = null;
    }
  }

  toggleClockSwitch(roomCode, color, desiredState = null) {
    const game = this.games.get(roomCode);
    if (!game || (color !== 'white' && color !== 'black')) return null;

    const wasRunning = this.isClockRunning(game);
    if (wasRunning && game.lastMoveTime) {
      const turn = game.chess.turn() === 'w' ? 'white' : 'black';
      const elapsed = Date.now() - game.lastMoveTime;
      game.clocks[turn] = Math.max(0, game.clocks[turn] - elapsed);
    }

    const currentState = Boolean(game.clockSwitches[color]);
    const newState = desiredState !== null ? Boolean(desiredState) : !currentState;
    game.clockSwitches[color] = newState;

    const nowRunning = this.isClockRunning(game);
    if (nowRunning) {
      game.lastMoveTime = Date.now();
      this.startClockTimer(roomCode);
    } else {
      this.stopClockTimer(roomCode);
    }

    return {
      clockSwitches: { ...game.clockSwitches },
      clocks: this.getClocks(roomCode),
      isRunning: nowRunning
    };
  }

  pauseGame(roomCode) {
    const game = this.games.get(roomCode);
    if (!game || !game.isStarted || game.isEnded || game.isPaused) return;

    if (this.isClockRunning(game) && game.lastMoveTime && game.timeControl?.initial > 0) {
      const turn = game.chess.turn() === 'w' ? 'white' : 'black';
      const elapsed = Date.now() - game.lastMoveTime;
      game.clocks[turn] = Math.max(0, game.clocks[turn] - elapsed);
    }

    game.isPaused = true;
    this.stopClockTimer(roomCode);
  }

  resumeGame(roomCode) {
    const game = this.games.get(roomCode);
    if (!game || !game.isStarted || game.isEnded || !game.isPaused) return;

    game.isPaused = false;
    game.lastMoveTime = Date.now();
    if (this.isClockRunning(game)) {
      this.startClockTimer(roomCode);
    }
  }

  deleteGame(roomCode) {
    const game = this.games.get(roomCode);
    if (game) {
      this.stopClockTimer(roomCode);
      this.games.delete(roomCode);
      console.log(`Game ${roomCode} deleted`);
    }
  }

  setPlayerNames(roomCode, whiteName, blackName) {
    const game = this.games.get(roomCode);
    if (!game) return;
    
    game.whiteName = whiteName;
    game.blackName = blackName;
    
    // Set PGN headers
    game.chess.header('Event', 'Indie Chess Game');
    game.chess.header('Site', 'chess.yunkhngn.dev');
    game.chess.header('Date', new Date().toISOString().split('T')[0]);
    game.chess.header('White', whiteName || 'White');
    game.chess.header('Black', blackName || 'Black');
  }

  startGame(roomCode, onTimeout = null) {
    const game = this.games.get(roomCode);
    if (!game || game.isStarted) return false;

    game.isStarted = true;
    game.isPaused = false;
    game.startTime = Date.now();
    game.lastMoveTime = Date.now();
    if (onTimeout) {
      game.onTimeout = onTimeout;
    }
    if (this.isClockRunning(game)) {
      this.startClockTimer(roomCode);
    }
    
    return true;
  }

  makeMove(roomCode, from, to, promotion = null) {
    const game = this.games.get(roomCode);
    if (!game || game.isEnded) {
      return { error: 'Game not found or already ended' };
    }

    const chess = game.chess;
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    const wasRunning = this.isClockRunning(game);
    
    // Update clock for the player who just moved if clock was running
    if (wasRunning && game.lastMoveTime && game.timeControl?.initial > 0) {
      const elapsed = Date.now() - game.lastMoveTime;
      const remaining = game.clocks[turn] - elapsed;
      
      if (remaining <= 0) {
        this.stopClockTimer(roomCode);
        game.clocks[turn] = 0;
        game.isEnded = true;
        const winner = turn === 'white' ? 'black' : 'white';
        game.result = {
          winner,
          reason: 'timeout'
        };
        return {
          error: 'Time expired',
          gameOver: true,
          result: game.result,
          clocks: this.getClocks(roomCode)
        };
      }

      // Add increment
      game.clocks[turn] = remaining + (game.timeControl.increment || 0);
    }

    try {
      const moveResult = chess.move({
        from,
        to,
        promotion: promotion || undefined
      });

      if (!moveResult) {
        return { error: 'Invalid move' };
      }

      game.moves.push({
        san: moveResult.san,
        from,
        to,
        promotion,
        by: turn,
        timestamp: Date.now()
      });

      game.lastMoveTime = Date.now();

      // Check for game end
      let gameOver = false;
      let result = null;

      if (chess.isCheckmate()) {
        gameOver = true;
        result = {
          winner: turn,
          reason: 'checkmate'
        };
      } else if (chess.isDraw()) {
        gameOver = true;
        let reason = 'draw';
        if (chess.isStalemate()) reason = 'stalemate';
        else if (chess.isThreefoldRepetition()) reason = 'repetition';
        else if (chess.isInsufficientMaterial()) reason = 'insufficient';
        
        result = { winner: null, reason };
      }

      if (gameOver) {
        this.stopClockTimer(roomCode);
        game.isEnded = true;
        game.result = result;
      }

      return {
        success: true,
        san: moveResult.san,
        fen: chess.fen(),
        pgn: chess.pgn(),
        by: turn,
        gameOver,
        result,
        clocks: this.getClocks(roomCode),
        isCheck: chess.isCheck()
      };
    } catch (err) {
      return { error: 'Invalid move: ' + err.message };
    }
  }

  getClocks(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return null;

    const clocks = { ...game.clocks };
    
    // If clock is currently running, calculate current time for active player
    if (this.isClockRunning(game) && game.lastMoveTime && game.timeControl?.initial > 0) {
      const turn = game.chess.turn() === 'w' ? 'white' : 'black';
      const elapsed = Date.now() - game.lastMoveTime;
      clocks[turn] = Math.max(0, clocks[turn] - elapsed);
    }

    return clocks;
  }

  resign(roomCode, color) {
    const game = this.games.get(roomCode);
    if (!game || game.isEnded) return null;

    this.stopClockTimer(roomCode);
    game.isEnded = true;
    game.result = {
      winner: color === 'white' ? 'black' : 'white',
      reason: 'resignation'
    };

    return game.result;
  }

  offerDraw(roomCode, color) {
    const game = this.games.get(roomCode);
    if (!game || game.isEnded) return false;
    
    game.drawOffer = color;
    return true;
  }

  acceptDraw(roomCode, color) {
    const game = this.games.get(roomCode);
    if (!game || game.isEnded) return null;
    if (!game.drawOffer || game.drawOffer === color) return null;

    this.stopClockTimer(roomCode);
    game.isEnded = true;
    game.result = {
      winner: null,
      reason: 'agreement'
    };
    game.drawOffer = null;

    return game.result;
  }

  resetGame(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return false;

    this.stopClockTimer(roomCode);
    game.chess = new Chess();
    game.moves = [];
    game.startTime = null;
    game.lastMoveTime = null;
    game.clocks = {
      white: game.timeControl.initial,
      black: game.timeControl.initial
    };
    game.clockSwitches = {
      white: false,
      black: false
    };
    game.isStarted = false;
    game.isPaused = false;
    game.isEnded = false;
    game.result = null;
    game.drawOffer = null;

    return true;
  }

  getGameState(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return null;

    return {
      fen: game.chess.fen(),
      pgn: game.chess.pgn(),
      moves: game.moves,
      clocks: this.getClocks(roomCode),
      isStarted: game.isStarted,
      isPaused: !!game.isPaused,
      isEnded: game.isEnded,
      result: game.result,
      turn: game.chess.turn() === 'w' ? 'white' : 'black',
      isCheck: game.chess.isCheck(),
      timeControl: game.timeControl,
      isBilateral: !!game.isBilateral,
      clockSwitches: game.clockSwitches || { white: false, black: false }
    };
  }

  async savePGN(roomCode, whiteName, blackName) {
    const game = this.games.get(roomCode);
    if (!game) return null;

    const chess = game.chess;
    
    // Set headers
    chess.header('Event', 'Indie Chess Game');
    chess.header('Site', 'Indie Chess Online');
    chess.header('Date', new Date().toISOString().split('T')[0]);
    chess.header('White', whiteName);
    chess.header('Black', blackName);
    
    if (game.result) {
      if (game.result.winner === 'white') {
        chess.header('Result', '1-0');
      } else if (game.result.winner === 'black') {
        chess.header('Result', '0-1');
      } else {
        chess.header('Result', '1/2-1/2');
      }
      chess.header('Termination', game.result.reason);
    }

    const pgn = chess.pgn();
    
    // Save to file
    const pgnDir = config.pgnDirectory;
    if (!existsSync(pgnDir)) {
      await mkdir(pgnDir, { recursive: true });
    }

    const filename = `${roomCode}_${Date.now()}.pgn`;
    const filepath = path.join(pgnDir, filename);
    
    await writeFile(filepath, pgn, 'utf8');
    
    return { filepath, pgn };
  }
}

export const gameManager = new GameManager();
