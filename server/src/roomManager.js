import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map(); // playerId -> roomCode
    this.disconnectedPlayers = new Map(); // playerId -> { roomCode, disconnectTime }
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < config.roomCodeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createRoom(playerName, password = null, roomName = null, timeControl = null) {
    let roomCode;
    do {
      roomCode = this.generateRoomCode();
    } while (this.rooms.has(roomCode));

    const playerId = uuidv4();
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    // Randomly assign color to creator
    const creatorColor = Math.random() < 0.5 ? 'white' : 'black';

    const room = {
      code: roomCode,
      name: roomName || `${playerName}'s Game`,
      hasPassword: !!password,
      passwordHash: hashedPassword,
      createdAt: Date.now(),
      timeControl: timeControl || config.defaultTimeControl,
      players: {
        [creatorColor]: {
          id: playerId,
          name: playerName,
          socketId: null,
          connected: false
        }
      },
      game: null, // Will be initialized by GameManager
      pendingRequests: {
        restart: null,
        colorSwap: null
      },
      chat: []
    };

    this.rooms.set(roomCode, room);
    this.playerRooms.set(playerId, roomCode);

    return {
      roomCode,
      playerId,
      color: creatorColor
    };
  }

  async joinRoom(roomCode, playerName, password = null) {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return { error: 'Room not found' };
    }

    // Check password
    if (room.hasPassword) {
      if (!password) {
        return { error: 'Password required', requiresPassword: true };
      }
      const validPassword = await bcrypt.compare(password, room.passwordHash);
      if (!validPassword) {
        return { error: 'Invalid password' };
      }
    }

    // Find empty slot (player disconnected or never joined)
    let joinerColor = null;
    
    if (!room.players.white || !room.players.white.connected) {
      // Check if this slot was abandoned (disconnected for too long)
      if (room.players.white && !room.players.white.connected) {
        const playerId = room.players.white.id;
        const disconnectInfo = this.disconnectedPlayers.get(playerId);
        if (disconnectInfo) {
          const elapsed = Date.now() - disconnectInfo.disconnectTime;
          if (elapsed > config.reconnectWindow) {
            // Slot is abandoned, allow takeover
            this.playerRooms.delete(playerId);
            this.disconnectedPlayers.delete(playerId);
            room.players.white = null;
          }
        }
      }
      if (!room.players.white) {
        joinerColor = 'white';
      }
    }
    
    if (!joinerColor && (!room.players.black || !room.players.black.connected)) {
      if (room.players.black && !room.players.black.connected) {
        const playerId = room.players.black.id;
        const disconnectInfo = this.disconnectedPlayers.get(playerId);
        if (disconnectInfo) {
          const elapsed = Date.now() - disconnectInfo.disconnectTime;
          if (elapsed > config.reconnectWindow) {
            this.playerRooms.delete(playerId);
            this.disconnectedPlayers.delete(playerId);
            room.players.black = null;
          }
        }
      }
      if (!room.players.black) {
        joinerColor = 'black';
      }
    }

    // Check if both slots are taken and connected
    if (!joinerColor) {
      if (room.players.white?.connected && room.players.black?.connected) {
        return { error: 'Room is full' };
      }
      // One player is disconnected but still within reconnect window
      return { error: 'Waiting for player to reconnect. Try again in a minute.' };
    }

    const playerId = uuidv4();

    room.players[joinerColor] = {
      id: playerId,
      name: playerName,
      socketId: null,
      connected: false
    };

    this.playerRooms.set(playerId, roomCode);

    const opponentColor = joinerColor === 'white' ? 'black' : 'white';
    
    return {
      roomCode,
      playerId,
      color: joinerColor,
      opponentName: room.players[opponentColor]?.name,
      isOngoingGame: room.players[opponentColor]?.connected === true
    };
  }

  connectPlayer(roomCode, playerId, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    for (const color of ['white', 'black']) {
      if (room.players[color]?.id === playerId) {
        room.players[color].socketId = socketId;
        room.players[color].connected = true;
        this.disconnectedPlayers.delete(playerId);
        return { room, color };
      }
    }
    return null;
  }

  disconnectPlayer(socketId) {
    for (const [roomCode, room] of this.rooms) {
      for (const color of ['white', 'black']) {
        if (room.players[color]?.socketId === socketId) {
          const playerId = room.players[color].id;
          room.players[color].connected = false;
          room.players[color].socketId = null;
          
          this.disconnectedPlayers.set(playerId, {
            roomCode,
            disconnectTime: Date.now()
          });
          
          return { roomCode, playerId, color, playerName: room.players[color].name };
        }
      }
    }
    return null;
  }

  canReconnect(playerId) {
    const disconnectInfo = this.disconnectedPlayers.get(playerId);
    if (!disconnectInfo) return null;

    const elapsed = Date.now() - disconnectInfo.disconnectTime;
    if (elapsed > config.reconnectWindow) {
      this.disconnectedPlayers.delete(playerId);
      return null;
    }

    return disconnectInfo.roomCode;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  isRoomEmpty(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return true;
    
    // Room is empty if no players are connected
    const whiteConnected = room.players.white?.connected || false;
    const blackConnected = room.players.black?.connected || false;
    
    return !whiteConnected && !blackConnected;
  }

  deleteRoom(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Remove player mappings
    if (room.players.white?.id) {
      this.playerRooms.delete(room.players.white.id);
      this.disconnectedPlayers.delete(room.players.white.id);
    }
    if (room.players.black?.id) {
      this.playerRooms.delete(room.players.black.id);
      this.disconnectedPlayers.delete(room.players.black.id);
    }

    // Remove room
    this.rooms.delete(roomCode);
    console.log(`Room ${roomCode} deleted (empty/expired)`);
  }

  getRoomByPlayerId(playerId) {
    const roomCode = this.playerRooms.get(playerId);
    if (!roomCode) return null;
    return this.rooms.get(roomCode);
  }

  getPlayerColor(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    if (room.players.white?.id === playerId) return 'white';
    if (room.players.black?.id === playerId) return 'black';
    return null;
  }

  getOpponentSocketId(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const playerColor = this.getPlayerColor(roomCode, playerId);
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    
    return room.players[opponentColor]?.socketId;
  }

  swapColors(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const white = room.players.white;
    const black = room.players.black;
    
    room.players.white = black;
    room.players.black = white;
    
    return true;
  }

  addChatMessage(roomCode, playerId, text) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const playerColor = this.getPlayerColor(roomCode, playerId);
    if (!playerColor) return null;

    const message = {
      id: uuidv4(),
      from: room.players[playerColor].name,
      color: playerColor,
      text,
      timestamp: Date.now()
    };

    room.chat.push(message);
    
    // Keep only last 100 messages
    if (room.chat.length > 100) {
      room.chat.shift();
    }

    return message;
  }

  setPendingRequest(roomCode, type, requesterId) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    
    room.pendingRequests[type] = {
      requesterId,
      timestamp: Date.now()
    };
    return true;
  }

  getPendingRequest(roomCode, type) {
    const room = this.rooms.get(roomCode);
    return room?.pendingRequests[type] || null;
  }

  clearPendingRequest(roomCode, type) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.pendingRequests[type] = null;
    }
  }

  deleteRoom(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Clean up player mappings
    for (const color of ['white', 'black']) {
      if (room.players[color]) {
        this.playerRooms.delete(room.players[color].id);
        this.disconnectedPlayers.delete(room.players[color].id);
      }
    }

    this.rooms.delete(roomCode);
  }

  // Cleanup expired rooms
  cleanupExpiredRooms() {
    const now = Date.now();
    for (const [roomCode, room] of this.rooms) {
      if (now - room.createdAt > config.roomExpiryTime) {
        this.deleteRoom(roomCode);
      }
    }
  }

  // Get list of rooms for lobby
  getPublicRooms() {
    const rooms = [];
    
    for (const [roomCode, room] of this.rooms) {
      // Count connected players
      let playerCount = 0;
      let hasSlot = false;
      
      if (room.players.white?.connected) playerCount++;
      else if (!room.players.white) hasSlot = true;
      
      if (room.players.black?.connected) playerCount++;
      else if (!room.players.black) hasSlot = true;
      
      // Only show rooms with at least 1 player and available slots
      if (playerCount > 0 && hasSlot) {
        rooms.push({
          code: roomCode,
          name: room.name,
          hasPassword: room.hasPassword,
          playerCount,
          maxPlayers: 2,
          createdAt: room.createdAt,
          creatorName: room.players.white?.name || room.players.black?.name || 'Unknown',
          timeControl: room.timeControl || config.defaultTimeControl
        });
      }
    }
    
    // Sort by creation time (newest first)
    rooms.sort((a, b) => b.createdAt - a.createdAt);
    
    return rooms;
  }
}

export const roomManager = new RoomManager();
