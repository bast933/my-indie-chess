import { useState, useEffect } from 'react';
import { Copy, Download, RotateCcw, LogOut, Check, Crown, Minus, Loader2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import './GameOverModal.css';

export default function GameOverModal({
    result,
    playerColor,
    pgn,
    onRematch,
    onLeave,
    onClose,
    pendingRematch,
    onAcceptRematch,
    onDeclineRematch,
    rematchRequested
}) {
    const [copied, setCopied] = useState(false);

    const isWinner = result?.winner === playerColor;
    const isDraw = result?.winner === null;

    // Confetti effect when player wins
    useEffect(() => {
        if (isWinner) {
            // Fire confetti from left
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { x: 0.1, y: 0.6 }
            });
            // Fire confetti from right
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { x: 0.9, y: 0.6 }
            });
        }
    }, [isWinner]);

    const getResultText = () => {
        if (isDraw) return 'Draw';
        return isWinner ? 'Victory' : 'Defeat';
    };

    const getReasonText = () => {
        switch (result?.reason) {
            case 'checkmate':
                return 'Checkmate';
            case 'resignation':
                return isWinner ? 'Opponent resigned' : 'You resigned';
            case 'timeout':
                return isWinner ? 'Opponent ran out of time' : 'Time out';
            case 'stalemate':
                return 'Stalemate';
            case 'repetition':
                return 'Threefold repetition';
            case 'insufficient':
                return 'Insufficient material';
            case 'agreement':
                return 'By agreement';
            default:
                return '';
        }
    };

    const handleCopyPGN = async () => {
        try {
            await navigator.clipboard.writeText(pgn);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy PGN:', err);
        }
    };

    const handleDownloadPGN = () => {
        const blob = new Blob([pgn], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chess-game-${Date.now()}.pgn`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal game-over-modal" onClick={e => e.stopPropagation()}>
                {onClose && (
                    <button className="modal-close-btn" onClick={onClose} title="Close to review game">
                        <X size={18} />
                    </button>
                )}
                <div className={`result-header ${isDraw ? 'draw' : isWinner ? 'win' : 'lose'}`}>
                    <div className="result-icon-wrapper">
                        {isDraw ? <Minus size={24} /> : <Crown size={24} />}
                    </div>
                    <h2 className="result-text">{getResultText()}</h2>
                    <p className="result-reason">{getReasonText()}</p>
                </div>

                {pgn && (
                    <div className="pgn-section">
                        <div className="pgn-header">
                            <span className="pgn-label">Game PGN</span>
                            <div className="pgn-actions">
                                <button className="btn btn-ghost btn-sm" onClick={handleCopyPGN}>
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={handleDownloadPGN}>
                                    <Download size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="pgn-box">
                            <pre className="pgn-content">{pgn}</pre>
                        </div>
                    </div>
                )}

                {pendingRematch ? (
                    <div className="rematch-request-section">
                        <p className="rematch-request-text">
                            <strong>{pendingRematch.from}</strong> wants a rematch!
                        </p>
                        <div className="game-over-actions">
                            <button className="btn btn-secondary" onClick={onDeclineRematch}>
                                Decline
                            </button>
                            <button className="btn btn-primary" onClick={onAcceptRematch}>
                                <Check size={16} />
                                Accept
                            </button>
                        </div>
                    </div>
                ) : rematchRequested ? (
                    <div className="game-over-actions">
                        <button className="btn btn-secondary" onClick={onLeave}>
                            <LogOut size={16} />
                            Leave
                        </button>
                        <button className="btn btn-primary" disabled>
                            <Loader2 size={16} className="spinner" />
                            Waiting...
                        </button>
                    </div>
                ) : (
                    <div className="game-over-actions">
                        <button className="btn btn-secondary" onClick={onLeave}>
                            <LogOut size={16} />
                            Leave
                        </button>
                        <button className="btn btn-primary" onClick={onRematch}>
                            <RotateCcw size={16} />
                            Rematch
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
