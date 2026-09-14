import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { useStockfish } from './useStockfish';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Manages a fully local (offline) chess game against Stockfish.
 * No server or WebSocket required.
 *
 * @param {string} playerColor  'white' | 'black'
 * @param {number} depth        Stockfish search depth (1-20)
 * @param {object|null} timeControl  { initial: ms, increment: ms } or null for unlimited
 */
export function useComputerGame(playerColor = 'white', depth = 12, timeControl = null) {
    const chessRef = useRef(new Chess());
    const [fen, setFen] = useState(INITIAL_FEN);
    const [moves, setMoves] = useState([]);
    const [turn, setTurn] = useState('white');
    const [isCheck, setIsCheck] = useState(false);
    const [isEnded, setIsEnded] = useState(false);
    const [result, setResult] = useState(null);
    const [isStarted, setIsStarted] = useState(true);
    const [pgn, setPgn] = useState('');

    // Clocks
    const clocksRef = useRef({
        white: timeControl?.initial ?? 0,
        black: timeControl?.initial ?? 0,
        lastSync: Date.now()
    });
    const [clocks, setClocks] = useState({
        white: timeControl?.initial ?? 0,
        black: timeControl?.initial ?? 0
    });
    const clockIntervalRef = useRef(null);

    const { findBestMove, bestMove, isThinking } = useStockfish();

    const computerColor = playerColor === 'white' ? 'black' : 'white';

    // ── Clock management ──────────────────────────────────────────────
    const stopClock = useCallback(() => {
        if (clockIntervalRef.current) {
            clearInterval(clockIntervalRef.current);
            clockIntervalRef.current = null;
        }
    }, []);

    const startClock = useCallback((currentTurn) => {
        if (!timeControl || timeControl.initial === 0) return;
        stopClock();
        clocksRef.current.lastSync = Date.now();

        clockIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - clocksRef.current.lastSync;
            const remaining = Math.max(0, clocksRef.current[currentTurn] - elapsed);
            setClocks(prev => ({ ...prev, [currentTurn]: remaining }));

            if (remaining <= 0) {
                stopClock();
                const winner = currentTurn === 'white' ? 'black' : 'white';
                setIsEnded(true);
                setResult({ winner, reason: 'timeout' });
            }
        }, 100);
    }, [timeControl, stopClock]);

    const tickClock = useCallback((currentTurn) => {
        if (!timeControl || timeControl.initial === 0) return;
        const elapsed = Date.now() - clocksRef.current.lastSync;
        clocksRef.current[currentTurn] = Math.max(0, clocksRef.current[currentTurn] - elapsed);
        // Add increment to the player who just moved
        if (timeControl.increment) {
            clocksRef.current[currentTurn] += timeControl.increment;
        }
        setClocks({ white: clocksRef.current.white, black: clocksRef.current.black });
    }, [timeControl]);

    // ── Derive game over conditions ───────────────────────────────────
    const checkGameOver = useCallback((chess) => {
        if (chess.isGameOver()) {
            stopClock();
            setIsEnded(true);
            if (chess.isCheckmate()) {
                const loser = chess.turn() === 'w' ? 'white' : 'black';
                const winner = loser === 'white' ? 'black' : 'white';
                setResult({ winner, reason: 'checkmate' });
            } else if (chess.isDraw()) {
                let reason = 'draw';
                if (chess.isStalemate()) reason = 'stalemate';
                else if (chess.isInsufficientMaterial()) reason = 'insufficient_material';
                else if (chess.isThreefoldRepetition()) reason = 'threefold_repetition';
                setResult({ winner: null, reason });
            }
            return true;
        }
        return false;
    }, [stopClock]);

    // ── Player move ───────────────────────────────────────────────────
    const makeMove = useCallback((from, to, promotion = null) => {
        const chess = chessRef.current;
        if (isEnded) return false;
        if ((turn === 'white' ? 'w' : 'b') !== chess.turn()) return false;
        if (turn !== playerColor) return false; // Not player's turn

        try {
            const moveResult = chess.move({ from, to, promotion: promotion || undefined });
            if (!moveResult) return false;

            const prevTurn = turn;
            tickClock(prevTurn);

            const newTurn = chess.turn() === 'w' ? 'white' : 'black';
            setFen(chess.fen());
            setTurn(newTurn);
            setIsCheck(chess.isCheck());
            setPgn(chess.pgn());
            setMoves(prev => [...prev, { san: moveResult.san, from, to, by: prevTurn }]);

            if (!checkGameOver(chess)) {
                startClock(newTurn);
            }
            return true;
        } catch {
            return false;
        }
    }, [isEnded, turn, playerColor, tickClock, checkGameOver, startClock]);

    // ── Computer move ─────────────────────────────────────────────────
    // Trigger Stockfish when it's the computer's turn
    useEffect(() => {
        if (!isEnded && isStarted && turn === computerColor && !isThinking) {
            // Small delay so the UI shows the board first
            const t = setTimeout(() => {
                findBestMove(chessRef.current.fen(), depth);
            }, 300);
            return () => clearTimeout(t);
        }
    }, [turn, isEnded, isStarted, computerColor, isThinking, findBestMove, depth]);

    // Apply Stockfish's move when received
    useEffect(() => {
        if (!bestMove || isEnded || turn !== computerColor) return;

        const chess = chessRef.current;
        const from = bestMove.slice(0, 2);
        const to = bestMove.slice(2, 4);
        const promotion = bestMove[4] || null;

        try {
            const moveResult = chess.move({ from, to, promotion: promotion || undefined });
            if (!moveResult) return;

            const prevTurn = turn;
            tickClock(prevTurn);

            const newTurn = chess.turn() === 'w' ? 'white' : 'black';
            setFen(chess.fen());
            setTurn(newTurn);
            setIsCheck(chess.isCheck());
            setPgn(chess.pgn());
            setMoves(prev => [...prev, { san: moveResult.san, from, to, by: prevTurn }]);

            if (!checkGameOver(chess)) {
                startClock(newTurn);
            }
        } catch {
            // Illegal move from engine — shouldn't happen, but guard it
        }
    }, [bestMove, isEnded, turn, computerColor, tickClock, checkGameOver, startClock]);

    // Start clock when game begins
    useEffect(() => {
        if (isStarted && !isEnded && timeControl?.initial > 0) {
            startClock(turn);
        }
        return () => stopClock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // only on mount

    // ── Player resign ─────────────────────────────────────────────────
    const resign = useCallback(() => {
        if (isEnded) return;
        stopClock();
        setIsEnded(true);
        setResult({ winner: computerColor, reason: 'resignation' });
    }, [isEnded, computerColor, stopClock]);

    // ── Reset / new game ──────────────────────────────────────────────
    const reset = useCallback(() => {
        stopClock();
        const chess = new Chess();
        chessRef.current = chess;
        setFen(INITIAL_FEN);
        setMoves([]);
        setTurn('white');
        setIsCheck(false);
        setIsEnded(false);
        setResult(null);
        setIsStarted(true);
        setPgn('');
        const initial = timeControl?.initial ?? 0;
        clocksRef.current = { white: initial, black: initial, lastSync: Date.now() };
        setClocks({ white: initial, black: initial });
        if (initial > 0) startClock('white');
    }, [stopClock, timeControl, startClock]);

    return {
        fen,
        moves,
        turn,
        isCheck,
        isEnded,
        isStarted,
        result,
        pgn,
        clocks,
        timeControl,
        playerColor,
        computerColor,
        isThinking,
        makeMove,
        resign,
        reset
    };
}
