import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function useChessSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  
  const [gameState, setGameState] = useState({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    pgn: '',
    isStarted: false,
    isEnded: false,
    result: null,
    turn: 'white',
    isCheck: false
  });
  
  const [clocks, setClocks] = useState({ white: 600000, black: 600000 });
  const [timeControl, setTimeControl] = useState(null);
  const [chat, setChat] = useState([]);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [error, setError] = useState(null);
  
  const callbacksRef = useRef({});
  const clockSyncRef = useRef({
    white: 600000,
    black: 600000,
    lastSync: Date.now()
  });

  const syncClocks = useCallback((newClocks) => {
    if (!newClocks) return;
    clockSyncRef.current = {
      white: typeof newClocks.white === 'number' ? newClocks.white : 600000,
      black: typeof newClocks.black === 'number' ? newClocks.black : 600000,
      lastSync: Date.now()
    };
    setClocks(newClocks);
  }, []);

  const syncClocksRef = useRef(syncClocks);
  syncClocksRef.current = syncClocks;

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setError(null);
      
      // Try to reconnect to room if we have stored credentials
      const storedRoom = sessionStorage.getItem('chess_room');
      const storedPlayer = sessionStorage.getItem('chess_player');
      if (storedRoom && storedPlayer) {
        newSocket.emit('reconnect_room', {
          roomCode: storedRoom,
          playerId: storedPlayer
        });
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      setError('Connection failed: ' + err.message);
    });

    // Room events
    newSocket.on('room_created', (data) => {
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setPlayerColor(data.color);
      if (data.timeControl) setTimeControl(data.timeControl);
      sessionStorage.setItem('chess_room', data.roomCode);
      sessionStorage.setItem('chess_player', data.playerId);
      callbacksRef.current.onRoomCreated?.(data);
    });

    newSocket.on('joined', (data) => {
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setPlayerColor(data.color);
      setOpponentName(data.opponentName);
      setOpponentConnected(true);
      if (data.timeControl) setTimeControl(data.timeControl);
      setGameState({
        fen: data.fen,
        moves: data.moves || [],
        pgn: data.pgn || '',
        isStarted: data.isStarted,
        isEnded: data.isEnded,
        result: data.result,
        turn: data.turn,
        isCheck: data.isCheck
      });
      syncClocksRef.current(data.clocks || { white: 600000, black: 600000 });
      setChat(data.chat || []);
      sessionStorage.setItem('chess_room', data.roomCode);
      sessionStorage.setItem('chess_player', data.playerId);
      callbacksRef.current.onJoined?.(data);
    });

    newSocket.on('join_error', (data) => {
      setError(data.message);
      callbacksRef.current.onJoinError?.(data);
    });

    newSocket.on('reconnected', (data) => {
      const opponentColor = data.color === 'white' ? 'black' : 'white';
      const opponentPlayer = data.players[opponentColor];
      
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setPlayerColor(data.color);
      setOpponentConnected(opponentPlayer?.connected || false);
      setOpponentName(opponentPlayer?.name);
      if (data.timeControl) setTimeControl(data.timeControl);
      setGameState({
        fen: data.fen,
        moves: data.moves || [],
        pgn: data.pgn || '',
        isStarted: data.isStarted,
        isEnded: data.isEnded,
        result: data.result,
        turn: data.turn,
        isCheck: data.isCheck
      });
      syncClocksRef.current(data.clocks);
      setChat(data.chat || []);
      callbacksRef.current.onReconnected?.(data);
    });

    newSocket.on('reconnect_error', (data) => {
      sessionStorage.removeItem('chess_room');
      sessionStorage.removeItem('chess_player');
    });

    newSocket.on('opponent_joined', (data) => {
      setOpponentName(data.name);
      setOpponentConnected(true);
    });

    newSocket.on('opponent_disconnected', (data) => {
      setOpponentConnected(false);
      if (data?.clocks) {
        syncClocksRef.current(data.clocks);
      }
    });

    newSocket.on('opponent_reconnected', (data) => {
      setOpponentConnected(true);
      if (data?.clocks) {
        syncClocksRef.current(data.clocks);
      }
    });

    // Game events
    newSocket.on('game_started', (data) => {
      setGameState(prev => ({ ...prev, isStarted: true }));
      syncClocksRef.current(data.clocks);
      // Game can only start when opponent joins, so they must be connected
      setOpponentConnected(true);
    });

    newSocket.on('move_made', (data) => {
      setGameState(prev => ({
        ...prev,
        fen: data.fen,
        moves: [...prev.moves, { san: data.san, from: data.from, to: data.to, by: data.by }],
        turn: data.by === 'white' ? 'black' : 'white',
        isCheck: data.isCheck
      }));
      syncClocksRef.current(data.clocks);
    });

    newSocket.on('move_error', (data) => {
      setError(data.message);
    });

    newSocket.on('game_over', (data) => {
      setGameState(prev => ({
        ...prev,
        isEnded: true,
        result: data.result,
        pgn: data.pgn
      }));
    });

    newSocket.on('game_restarted', (data) => {
      if (data.timeControl) setTimeControl(data.timeControl);
      setGameState({
        fen: data.fen,
        moves: [],
        pgn: '',
        isStarted: true,
        isEnded: false,
        result: null,
        turn: 'white',
        isCheck: false
      });
      syncClocksRef.current(data.clocks);
      setPendingRequest(null);
    });

    newSocket.on('colors_swapped', (data) => {
      setPlayerColor(prev => prev === 'white' ? 'black' : 'white');
      setPendingRequest(null);
    });

    // Request events
    newSocket.on('restart_request', (data) => {
      setPendingRequest({ type: 'restart', from: data.from, fromColor: data.fromColor });
    });

    newSocket.on('restart_declined', () => {
      setPendingRequest(null);
    });

    newSocket.on('color_request', (data) => {
      setPendingRequest({ type: 'color', from: data.from, preferred: data.preferred });
    });

    newSocket.on('color_request_declined', () => {
      setPendingRequest(null);
    });

    // Draw events
    newSocket.on('draw_offer', (data) => {
      setPendingRequest({ type: 'draw', from: data.from });
    });

    newSocket.on('draw_declined', () => {
      setPendingRequest(null);
    });

    // Chat events
    newSocket.on('chat_message', (message) => {
      setChat(prev => [...prev, message]);
    });

    // Room list updates
    newSocket.on('rooms_list', (data) => {
      callbacksRef.current.onRoomsList?.(data);
    });

    // Clock updates
    newSocket.on('clock_update', (data) => {
      syncClocksRef.current(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Smooth local clock countdown
  useEffect(() => {
    const isClockActive = gameState.isStarted && !gameState.isEnded && opponentConnected && (!timeControl || timeControl.initial > 0);

    if (!isClockActive) {
      clockSyncRef.current.lastSync = Date.now();
      return;
    }

    const interval = setInterval(() => {
      const activeTurn = gameState.turn; // 'white' or 'black'
      const now = Date.now();
      const elapsed = now - clockSyncRef.current.lastSync;
      const baseTime = clockSyncRef.current[activeTurn];
      const remaining = Math.max(0, baseTime - elapsed);

      setClocks(prev => {
        if (prev[activeTurn] === remaining) return prev;
        return {
          ...prev,
          [activeTurn]: remaining
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameState.isStarted, gameState.isEnded, gameState.turn, opponentConnected, timeControl]);

  // Actions
  const createRoom = useCallback((name, password = null, roomName = null, timeControl = null) => {
    if (socket) {
      socket.emit('create_room', { name, password, roomName, timeControl });
    }
  }, [socket]);

  const getRooms = useCallback(() => {
    if (socket) {
      socket.emit('get_rooms');
    }
  }, [socket]);

  const joinRoom = useCallback((code, name, password = null) => {
    if (socket) {
      setError(null);
      socket.emit('join_room', { roomCode: code, name, password });
    }
  }, [socket]);

  const makeMove = useCallback((from, to, promotion = null) => {
    if (socket) {
      socket.emit('make_move', { from, to, promotion });
    }
  }, [socket]);

  const sendChat = useCallback((text) => {
    if (socket && text.trim()) {
      socket.emit('chat', { text: text.trim() });
    }
  }, [socket]);

  const requestRestart = useCallback(() => {
    if (socket) {
      socket.emit('request_restart');
    }
  }, [socket]);

  const approveRestart = useCallback(() => {
    if (socket) {
      socket.emit('approve_restart');
    }
  }, [socket]);

  const declineRestart = useCallback(() => {
    if (socket) {
      socket.emit('decline_restart');
      setPendingRequest(null);
    }
  }, [socket]);

  const requestColorSwap = useCallback((preferred) => {
    if (socket) {
      socket.emit('request_color', { preferred });
    }
  }, [socket]);

  const approveColorSwap = useCallback(() => {
    if (socket) {
      socket.emit('approve_color');
    }
  }, [socket]);

  const declineColorSwap = useCallback(() => {
    if (socket) {
      socket.emit('decline_color');
      setPendingRequest(null);
    }
  }, [socket]);

  const resign = useCallback(() => {
    if (socket) {
      socket.emit('resign');
    }
  }, [socket]);

  const offerDraw = useCallback(() => {
    if (socket) {
      socket.emit('offer_draw');
    }
  }, [socket]);

  const acceptDraw = useCallback(() => {
    if (socket) {
      socket.emit('accept_draw');
    }
  }, [socket]);

  const declineDraw = useCallback(() => {
    if (socket) {
      socket.emit('decline_draw');
      setPendingRequest(null);
    }
  }, [socket]);

  const leaveRoom = useCallback(() => {
    sessionStorage.removeItem('chess_room');
    sessionStorage.removeItem('chess_player');
    setRoomCode(null);
    setPlayerId(null);
    setPlayerColor(null);
    setOpponentName(null);
    setOpponentConnected(false);
    setGameState({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
      pgn: '',
      isStarted: false,
      isEnded: false,
      result: null,
      turn: 'white',
      isCheck: false
    });
    setChat([]);
    setPendingRequest(null);
  }, []);

  const setCallbacks = useCallback((callbacks) => {
    callbacksRef.current = callbacks;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Connection state
    connected,
    error,
    clearError,
    
    // Room state
    roomCode,
    playerId,
    playerColor,
    opponentName,
    opponentConnected,
    
    // Game state
    gameState,
    clocks,
    timeControl,
    chat,
    pendingRequest,
    
    // Actions
    createRoom,
    getRooms,
    joinRoom,
    makeMove,
    sendChat,
    requestRestart,
    approveRestart,
    declineRestart,
    requestColorSwap,
    approveColorSwap,
    declineColorSwap,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    leaveRoom,
    setCallbacks
  };
}
