import { useState } from 'react';
import { Flag, Handshake, RotateCcw, ArrowLeftRight, Lightbulb, Loader2 } from 'lucide-react';
import './GameControls.css';

export default function GameControls({
    onResign,
    onOfferDraw,
    onRequestRestart,
    onRequestColorSwap,
    onSuggestMove,
    isSuggesting,
    suggestRemaining = 3,
    suggestCooldownRemaining = 0,
    isGameEnded,
    isGameStarted,
    hasOpponent,
    movesCount = 0
}) {
    const [showConfirmResign, setShowConfirmResign] = useState(false);

    const handleResign = () => {
        if (showConfirmResign) {
            onResign();
            setShowConfirmResign(false);
        } else {
            setShowConfirmResign(true);
            setTimeout(() => setShowConfirmResign(false), 3000);
        }
    };

    // Can swap colors only if no moves have been made yet
    const canSwapColors = hasOpponent && (movesCount === 0 || isGameEnded);

    // Suggest button state
    const isSuggestDisabled = isSuggesting || suggestRemaining <= 0 || suggestCooldownRemaining > 0;

    const getSuggestLabel = () => {
        if (suggestCooldownRemaining > 0) {
            return `${suggestCooldownRemaining}s`;
        }
        return `Suggest (${suggestRemaining})`;
    };

    return (
        <div className="game-controls card">
            <div className="card-header">
                <h3 className="card-title">Controls</h3>
            </div>

            <div className="controls-grid">
                {!isGameEnded && isGameStarted && movesCount > 0 && (
                    <>
                        <button
                            className={`control-btn ${showConfirmResign ? 'confirm' : ''}`}
                            onClick={handleResign}
                            disabled={!hasOpponent}
                        >
                            <Flag size={20} />
                            <span>{showConfirmResign ? 'Confirm?' : 'Resign'}</span>
                        </button>

                        <button
                            className="control-btn"
                            onClick={onOfferDraw}
                            disabled={!hasOpponent}
                        >
                            <Handshake size={20} />
                            <span>Offer Draw</span>
                        </button>

                        <button
                            className={`control-btn ${suggestRemaining <= 0 ? 'disabled-permanent' : ''}`}
                            onClick={onSuggestMove}
                            disabled={isSuggestDisabled}
                            title={suggestRemaining <= 0 ? 'No suggestions remaining' : suggestCooldownRemaining > 0 ? `Wait ${suggestCooldownRemaining}s` : `${suggestRemaining} suggestions remaining`}
                        >
                            {isSuggesting ? (
                                <Loader2 size={20} className="spinner" />
                            ) : (
                                <Lightbulb size={20} />
                            )}
                            <span>{getSuggestLabel()}</span>
                        </button>
                    </>
                )}

                {isGameEnded && (
                    <button
                        className="control-btn primary"
                        onClick={onRequestRestart}
                        disabled={!hasOpponent}
                    >
                        <RotateCcw size={20} />
                        <span>Rematch</span>
                    </button>
                )}

                {!isGameEnded && (
                    <button
                        className="control-btn"
                        onClick={onRequestColorSwap}
                        disabled={!canSwapColors}
                        title={!canSwapColors ? 'Cannot swap colors after game starts' : 'Request to swap colors'}
                    >
                        <ArrowLeftRight size={20} />
                        <span>Swap Colors</span>
                    </button>
                )}
            </div>
        </div>
    );
}
