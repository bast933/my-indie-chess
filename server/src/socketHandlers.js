import { roomManager } from './roomManager.js';
import { gameManager } from './gameManager.js';
import { config } from './config.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Get list of available rooms
    socket.on('get_rooms', () => {
      const rooms = roomManager.getPublicRooms();
      socket.emit('rooms_list', rooms);
    });

    // Create a new room
    socket.on('create_room', async ({ name, password, roomName, timeControl }) => {
      try {
        const result = await roomManager.createRoom(name, password, roomName, timeControl);
        const { roomCode, playerId, color } = result;

        // Initialize game for this room
        gameManager.initGame(roomCode, timeControl);

        socket.join(roomCode);
        roomManager.connectPlayer(roomCode, playerId, socket.id);

        socket.emit('room_created', {
          roomCode,
          playerId,
          color,
          timeControl: timeControl || gameManager.getGame(roomCode).timeControl
        });

        console.log(`Room created: ${roomCode} by ${name} as ${color}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to create room: ' + err.message });
      }
    });

    // Join an existing room
    socket.on('join_room', async ({ roomCode, name, password }) => {
      try {
        const result = await roomManager.joinRoom(roomCode, name, password);

        if (result.error) {
          socket.emit('join_error', {
            message: result.error,
            requiresPassword: result.requiresPassword
          });
          return;
        }

        const { playerId, color, opponentName } = result;
        
        socket.join(roomCode);
        roomManager.connectPlayer(roomCode, playerId, socket.id);

        const room = roomManager.getRoom(roomCode);

        // Set player names for PGN BEFORE getting game state
        const whiteName = room.players.white?.name || 'White';
        const blackName = room.players.black?.name || 'Black';
        gameManager.setPlayerNames(roomCode, whiteName, blackName);

        // Start the game now that both players joined
        gameManager.startGame(roomCode, (rCode, gameResult, clocks) => {
          io.to(rCode).emit('clock_update', clocks);
          handleGameEnd(io, rCode, gameResult);
        });

        // Get game state AFTER names are set
        const gameState = gameManager.getGameState(roomCode);

        socket.emit('joined', {
          roomCode,
          playerId,
          color,
          opponentName,
          ...gameState,
          chat: room.chat
        });

        // Notify opponent
        const opponentSocketId = roomManager.getOpponentSocketId(roomCode, playerId);
        if (opponentSocketId) {
          io.to(opponentSocketId).emit('opponent_joined', {
            name,
            color: color === 'white' ? 'black' : 'white'
          });
          
          // Also notify that game has started
          io.to(roomCode).emit('game_started', {
            clocks: gameManager.getClocks(roomCode)
          });
        }

        console.log(`Player ${name} joined room ${roomCode} as ${color}`);
      } catch (err) {
        socket.emit('join_error', { message: 'Failed to join room: ' + err.message });
      }
    });

    // Reconnect to a room
    socket.on('reconnect_room', ({ roomCode, playerId }) => {
      const canReconnect = roomManager.canReconnect(playerId);
      
      if (!canReconnect || canReconnect !== roomCode) {
        socket.emit('reconnect_error', { message: 'Cannot reconnect to this room' });
        return;
      }

      const connectResult = roomManager.connectPlayer(roomCode, playerId, socket.id);
      if (!connectResult) {
        socket.emit('reconnect_error', { message: 'Failed to reconnect' });
        return;
      }

      socket.join(roomCode);

      const { color } = connectResult;
      const room = roomManager.getRoom(roomCode);
      gameManager.resumeGame(roomCode);
      const gameState = gameManager.getGameState(roomCode);

      socket.emit('reconnected', {
        roomCode,
        playerId,
        color,
        players: {
          white: {
            name: room.players.white?.name,
            connected: room.players.white?.connected || false
          },
          black: {
            name: room.players.black?.name,
            connected: room.players.black?.connected || false
          }
        },
        ...gameState,
        chat: room.chat
      });

      // Notify opponent
      const opponentSocketId = roomManager.getOpponentSocketId(roomCode, playerId);
      if (opponentSocketId) {
        io.to(opponentSocketId).emit('opponent_reconnected', {
          color: color,
          clocks: gameManager.getClocks(roomCode)
        });
      }

      console.log(`Player reconnected to room ${roomCode}`);
    });

    // Make a move
    socket.on('make_move', ({ from, to, promotion }) => {
      const disconnectInfo = getPlayerInfo(socket.id);
      if (!disconnectInfo) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const { roomCode, playerId, color } = disconnectInfo;
      const game = gameManager.getGame(roomCode);
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Check if it's this player's turn
      const turn = game.chess.turn() === 'w' ? 'white' : 'black';
      if (turn !== color) {
        socket.emit('move_error', { message: 'Not your turn' });
        return;
      }

      const result = gameManager.makeMove(roomCode, from, to, promotion);

      if (result.error) {
        socket.emit('move_error', { message: result.error });
        
        if (result.gameOver) {
          handleGameEnd(io, roomCode, result.result);
        }
        return;
      }

      // Broadcast move to room
      io.to(roomCode).emit('move_made', {
        san: result.san,
        fen: result.fen,
        from,
        to,
        promotion,
        by: result.by,
        clocks: result.clocks,
        isCheck: result.isCheck
      });

      if (result.gameOver) {
        handleGameEnd(io, roomCode, result.result);
      }
    });

    // Chat message
    socket.on('chat', ({ text }) => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, playerId } = playerInfo;
      const message = roomManager.addChatMessage(roomCode, playerId, text);

      if (message) {
        io.to(roomCode).emit('chat_message', message);
      }
    });

    // Request restart
    socket.on('request_restart', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, playerId, color } = playerInfo;
      const room = roomManager.getRoom(roomCode);

      // Check if there's already a pending request from this player
      const pending = roomManager.getPendingRequest(roomCode, 'restart');
      if (pending && pending.requesterId === playerId) {
        return; // Already requested
      }

      roomManager.setPendingRequest(roomCode, 'restart', playerId);

      // Notify opponent
      const opponentSocketId = roomManager.getOpponentSocketId(roomCode, playerId);
      if (opponentSocketId) {
        io.to(opponentSocketId).emit('restart_request', {
          from: room.players[color].name,
          fromColor: color
        });
      }
    });

    // Approve restart
    socket.on('approve_restart', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, playerId } = playerInfo;
      const pending = roomManager.getPendingRequest(roomCode, 'restart');

      // Only opponent can approve
      if (!pending || pending.requesterId === playerId) {
        return;
      }

      roomManager.clearPendingRequest(roomCode, 'restart');
      gameManager.resetGame(roomCode);
      gameManager.startGame(roomCode, (rCode, gameResult, clocks) => {
        io.to(rCode).emit('clock_update', clocks);
        handleGameEnd(io, rCode, gameResult);
      });

      const gameState = gameManager.getGameState(roomCode);
      io.to(roomCode).emit('game_restarted', gameState);
    });

    // Decline restart
    socket.on('decline_restart', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, playerId } = playerInfo;
      roomManager.clearPendingRequest(roomCode, 'restart');

      io.to(roomCode).emit('restart_declined');
    });

    // Request color swap
    socket.on('request_color', ({ preferred }) => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, playerId, color } = playerInfo;
      const room = roomManager.getRoom(roomCode);

      // Can only request if no moves have been made yet or game ended
      const game = gameManager.getGame(roomCode);
      if (game && game.moves.length > 0 && !game.isEnded) {
        socket.emit('error', { message: 'Cannot change colors after game starts' });
        return;
      }

      roomManager.setPendingRequest(roomCode, 'colorSwap', playerId);

      const opponentSocketId = roomManager.getOpponentSocketId(roomCode, playerId);
      if (opponentSocketId) {
        io.to(opponentSocketId).emit('color_request', {
          from: room.players[color].name,
          preferred
        });
      }
    });

    // Approve color swap
    socket.on('approve_color', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, playerId } = playerInfo;
      const pending = roomManager.getPendingRequest(roomCode, 'colorSwap');

      if (!pending || pending.requesterId === playerId) {
        return;
      }

      roomManager.clearPendingRequest(roomCode, 'colorSwap');
      roomManager.swapColors(roomCode);
      gameManager.resetGame(roomCode);

      const room = roomManager.getRoom(roomCode);
      
      io.to(roomCode).emit('colors_swapped', {
        white: room.players.white?.name,
        black: room.players.black?.name
      });
    });

    // Decline color swap
    socket.on('decline_color', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode } = playerInfo;
      roomManager.clearPendingRequest(roomCode, 'colorSwap');

      io.to(roomCode).emit('color_request_declined');
    });

    // Resign
    socket.on('resign', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, color } = playerInfo;
      const result = gameManager.resign(roomCode, color);

      if (result) {
        handleGameEnd(io, roomCode, result);
      }
    });

    // Offer draw
    socket.on('offer_draw', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, playerId, color } = playerInfo;
      const room = roomManager.getRoom(roomCode);

      gameManager.offerDraw(roomCode, color);

      const opponentSocketId = roomManager.getOpponentSocketId(roomCode, playerId);
      if (opponentSocketId) {
        io.to(opponentSocketId).emit('draw_offer', {
          from: room.players[color].name
        });
      }
    });

    // Accept draw
    socket.on('accept_draw', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode, color } = playerInfo;
      const result = gameManager.acceptDraw(roomCode, color);

      if (result) {
        handleGameEnd(io, roomCode, result);
      }
    });

    // Decline draw
    socket.on('decline_draw', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode } = playerInfo;
      const game = gameManager.getGame(roomCode);
      if (game) {
        game.drawOffer = null;
      }

      io.to(roomCode).emit('draw_declined');
    });

    // Get clock update
    socket.on('get_clocks', () => {
      const playerInfo = getPlayerInfo(socket.id);
      if (!playerInfo) return;

      const { roomCode } = playerInfo;
      const clocks = gameManager.getClocks(roomCode);

      if (clocks) {
        socket.emit('clock_update', clocks);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const result = roomManager.disconnectPlayer(socket.id);
      
      if (result) {
        const { roomCode, playerName, color } = result;
        
        // Pause game clock if ongoing
        gameManager.pauseGame(roomCode);

        // Notify opponent
        io.to(roomCode).emit('opponent_disconnected', {
          name: playerName,
          color,
          clocks: gameManager.getClocks(roomCode)
        });

        console.log(`Player ${playerName} disconnected from room ${roomCode}`);

        // Schedule room cleanup after reconnect window expires
        setTimeout(() => {
          if (roomManager.isRoomEmpty(roomCode)) {
            gameManager.deleteGame(roomCode);
            roomManager.deleteRoom(roomCode);
          }
        }, config.reconnectWindow + 5000); // Add 5s buffer after reconnect window
      }
    });
  });

  // Helper function to get player info from socket
  function getPlayerInfo(socketId) {
    for (const [roomCode, room] of roomManager.rooms) {
      for (const color of ['white', 'black']) {
        if (room.players[color]?.socketId === socketId) {
          return {
            roomCode,
            playerId: room.players[color].id,
            color,
            name: room.players[color].name
          };
        }
      }
    }
    return null;
  }

  // Handle game end
  async function handleGameEnd(io, roomCode, result) {
    const room = roomManager.getRoom(roomCode);
    
    io.to(roomCode).emit('game_over', {
      result,
      pgn: gameManager.getGame(roomCode)?.chess.pgn()
    });

    // Save PGN
    try {
      const whiteName = room.players.white?.name || 'White';
      const blackName = room.players.black?.name || 'Black';
      await gameManager.savePGN(roomCode, whiteName, blackName);
      console.log(`PGN saved for room ${roomCode}`);
    } catch (err) {
      console.error(`Failed to save PGN for room ${roomCode}:`, err);
    }
  }

  // Cleanup expired rooms periodically
  setInterval(() => {
    roomManager.cleanupExpiredRooms();
  }, 60 * 60 * 1000); // Every hour
}
