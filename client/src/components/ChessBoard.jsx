import { useState, useMemo, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Loader2, Pause } from 'lucide-react';
import { useChessSound } from '../hooks/useChessSound';
import './ChessBoard.css';

export default function ChessBoard({
    fen,
    playerColor,
    onMove,
    isMyTurn,
    isGameStarted,
    isGameEnded,
    lastMove,
    isCheck,
    opponentConnected = true,
    suggestedMove // 'e2e4'
}) {
    const [moveFrom, setMoveFrom] = useState(null);
    const [optionSquares, setOptionSquares] = useState({});
    const [rightClickedSquares, setRightClickedSquares] = useState({});
    const { playSound } = useChessSound();
    const prevFenRef = useRef(fen);

    const game = useMemo(() => {
        const chess = new Chess();
        chess.load(fen);
        return chess;
    }, [fen]);



    // Play sound when a move is made (fen changes)
    useEffect(() => {
        if (prevFenRef.current !== fen && isGameStarted) {
            // Check if it's a capture by comparing piece counts
            const prevGame = new Chess();
            prevGame.load(prevFenRef.current);
            const prevPieceCount = prevGame.board().flat().filter(p => p).length;

            const currGame = new Chess();
            currGame.load(fen);
            const currPieceCount = currGame.board().flat().filter(p => p).length;

            const isCapture = currPieceCount < prevPieceCount;
            playSound(isCapture ? 'capture' : 'move');
        }
        prevFenRef.current = fen;
    }, [fen, isGameStarted, playSound]);

    const getMoveOptions = (square) => {
        const moves = game.moves({ square, verbose: true });
        if (moves.length === 0) return false;

        const newSquares = {};
        moves.forEach((move) => {
            newSquares[move.to] = {
                background: game.get(move.to)
                    ? 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 85%, transparent 85%)'
                    : 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 25%, transparent 25%)',
                borderRadius: '50%'
            };
        });
        newSquares[square] = {
            background: 'rgba(59, 130, 246, 0.3)'
        };
        setOptionSquares(newSquares);
        return true;
    };

    const onSquareClick = (square) => {
        if (isGameEnded || !isMyTurn || !opponentConnected) return;

        if (moveFrom) {
            const piece = game.get(moveFrom);

            const isPromotion =
                piece?.type === 'p' &&
                ((piece.color === 'w' && square[1] === '8') ||
                    (piece.color === 'b' && square[1] === '1'));

            const moveData = {
                from: moveFrom,
                to: square,
                promotion: isPromotion ? 'q' : undefined
            };

            try {
                const result = game.move(moveData);
                if (result) {
                    onMove(moveFrom, square, isPromotion ? 'q' : null);
                }
            } catch (e) {
                const hasMoves = getMoveOptions(square);
                setMoveFrom(hasMoves ? square : null);
                if (!hasMoves) setOptionSquares({});
                return;
            }

            setMoveFrom(null);
            setOptionSquares({});
            return;
        }

        const hasMoves = getMoveOptions(square);
        setMoveFrom(hasMoves ? square : null);
        if (!hasMoves) setOptionSquares({});
    };

    const onPieceDragBegin = (piece, sourceSquare) => {
        if (isGameEnded || !isMyTurn || !opponentConnected) return false;
        getMoveOptions(sourceSquare);
    };

    const onPieceDrop = (sourceSquare, targetSquare, piece) => {
        if (isGameEnded || !isMyTurn || !opponentConnected) return false;

        const pieceType = piece[1].toLowerCase();
        const isPromotion =
            pieceType === 'p' &&
            ((piece[0] === 'w' && targetSquare[1] === '8') ||
                (piece[0] === 'b' && targetSquare[1] === '1'));

        try {
            const result = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: isPromotion ? 'q' : undefined
            });

            if (result) {
                onMove(sourceSquare, targetSquare, isPromotion ? 'q' : null);
                setMoveFrom(null);
                setOptionSquares({});
                return true;
            }
        } catch (e) {
            // Invalid move
        }

        setMoveFrom(null);
        setOptionSquares({});
        return false;
    };

    const onSquareRightClick = (square) => {
        const color = 'rgba(239, 68, 68, 0.4)';
        setRightClickedSquares((prev) => ({
            ...prev,
            [square]: prev[square] ? undefined : { background: color }
        }));
    };

    const customSquareStyles = useMemo(() => {
        const styles = { ...optionSquares, ...rightClickedSquares };

        if (lastMove) {
            styles[lastMove.from] = {
                ...styles[lastMove.from],
                background: 'rgba(59, 130, 246, 0.2)'
            };
            styles[lastMove.to] = {
                ...styles[lastMove.to],
                background: 'rgba(59, 130, 246, 0.3)'
            };
        }

        if (isCheck) {
            const kingSquare = findKingSquare(game, game.turn());
            if (kingSquare) {
                styles[kingSquare] = {
                    ...styles[kingSquare],
                    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.7) 0%, rgba(239, 68, 68, 0.3) 50%, transparent 70%)'
                };
            }
        }

        // Highlight suggested move squares
        if (suggestedMove && suggestedMove.length === 4 && suggestedMove !== '(none)') {
            const from = suggestedMove.substring(0, 2);
            const to = suggestedMove.substring(2, 4);

            styles[from] = {
                ...styles[from],
                boxShadow: 'inset 0 0 10px rgba(255, 170, 0, 0.8)',
                transition: 'box-shadow 0.3s ease'
            };

            styles[to] = {
                ...styles[to],
                boxShadow: 'inset 0 0 10px rgba(255, 170, 0, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.4)',
                background: 'rgba(255, 170, 0, 0.2)',
                transition: 'all 0.3s ease'
            };
        }

        return styles;
    }, [optionSquares, rightClickedSquares, lastMove, isCheck, game, suggestedMove]);

    // Game is paused when opponent disconnects during an active game
    const isPaused = isGameStarted && !isGameEnded && !opponentConnected;

    return (
        <div className={`chess-board-wrapper ${!isMyTurn && isGameStarted ? 'not-my-turn' : ''}`}>
            <Chessboard
                id="BasicBoard"
                position={fen}
                onSquareClick={onSquareClick}
                onPieceDragBegin={onPieceDragBegin}
                onPieceDrop={onPieceDrop}
                onSquareRightClick={onSquareRightClick}
                boardOrientation={playerColor}
                customSquareStyles={customSquareStyles}
                areArrowsAllowed={true}
                customBoardStyle={{
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
                customDarkSquareStyle={{ backgroundColor: 'var(--color-black-square)' }}
                customLightSquareStyle={{ backgroundColor: 'var(--color-white-square)' }}
                animationDuration={200}
                arePiecesDraggable={isMyTurn && !isGameEnded && opponentConnected}
                showBoardNotation={true}
            />

            {!isGameStarted && !isGameEnded && (
                <div className="board-overlay">
                    <div className="waiting-message">
                        <Loader2 size={32} className="spinner" />
                        <span>Waiting for opponent...</span>
                    </div>
                </div>
            )}

            {isPaused && (
                <div className="board-overlay paused">
                    <div className="waiting-message">
                        <Pause size={32} />
                        <span>Game Paused</span>
                        <span className="pause-subtext">Waiting for opponent to reconnect...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function findKingSquare(game, color) {
    const board = game.board();
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'k' && piece.color === color) {
                const file = String.fromCharCode(97 + col);
                const rank = 8 - row;
                return `${file}${rank}`;
            }
        }
    }
    return null;
}
