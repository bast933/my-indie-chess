import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Sun,
    Moon,
    RotateCcw,
    Flag,
    Bot,
    User,
    Crown
} from 'lucide-react';
import { useComputerGame } from '../hooks/useComputerGame';
import ChessBoard from '../components/ChessBoard';
import MoveList from '../components/MoveList';
import ChessClock from '../components/ChessClock';
import GameOverModal from '../components/GameOverModal';
import './ComputerGamePage.css';

// Time control options (ms)
const TIME_OPTIONS = [
    { label: 'Unlimited',   initial: 0,           increment: 0 },
    { label: 'Bullet  1+0', initial: 1 * 60 * 1000, increment: 0 },
    { label: 'Bullet  2+1', initial: 2 * 60 * 1000, increment: 1000 },
    { label: 'Blitz   3+0', initial: 3 * 60 * 1000, increment: 0 },
    { label: 'Blitz   5+3', initial: 5 * 60 * 1000, increment: 3000 },
    { label: 'Rapid  10+0', initial: 10 * 60 * 1000, increment: 0 },
    { label: 'Rapid  10+5', initial: 10 * 60 * 1000, increment: 5000 },
];

const DIFFICULTY_LEVELS = [
    { label: 'Beginner',     depth: 1  },
    { label: 'Easy',         depth: 4  },
    { label: 'Intermediate', depth: 8  },
    { label: 'Hard',         depth: 14 },
    { label: 'Expert',       depth: 20 },
];

// ─── Setup Screen ────────────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
    const [color, setColor] = useState('white');
    const [diffIdx, setDiffIdx] = useState(2);
    const [timeIdx, setTimeIdx] = useState(0);

    return (
        <div className="cpu-setup-overlay">
            <div className="cpu-setup-card glass">
                <div className="cpu-setup-header">
                    <Crown size={32} className="cpu-setup-icon" />
                    <h2>Play vs Computer</h2>
                    <p>Configure your game</p>
                </div>

                <div className="cpu-setup-body">
                    {/* Color */}
                    <div className="setup-group">
                        <label className="setup-label">Play as</label>
                        <div className="color-picker">
                            <button
                                className={`color-btn ${color === 'white' ? 'active' : ''}`}
                                onClick={() => setColor('white')}
                            >
                                ♙ White
                            </button>
                            <button
                                className={`color-btn ${color === 'black' ? 'active' : ''}`}
                                onClick={() => setColor('black')}
                            >
                                ♟ Black
                            </button>
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div className="setup-group">
                        <label className="setup-label">
                            Difficulty — <span className="setup-highlight">{DIFFICULTY_LEVELS[diffIdx].label}</span>
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={DIFFICULTY_LEVELS.length - 1}
                            value={diffIdx}
                            onChange={e => setDiffIdx(Number(e.target.value))}
                            className="difficulty-slider"
                        />
                        <div className="slider-labels">
                            {DIFFICULTY_LEVELS.map((d, i) => (
                                <span key={i} className={i === diffIdx ? 'active' : ''}>{d.label}</span>
                            ))}
                        </div>
                    </div>

                    {/* Time Control */}
                    <div className="setup-group">
                        <label className="setup-label">Time Control</label>
                        <select
                            className="input select-input"
                            value={timeIdx}
                            onChange={e => setTimeIdx(Number(e.target.value))}
                        >
                            {TIME_OPTIONS.map((t, i) => (
                                <option key={i} value={i}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={() => onStart({
                        color,
                        depth: DIFFICULTY_LEVELS[diffIdx].depth,
                        timeControl: TIME_OPTIONS[timeIdx]
                    })}
                >
                    Start Game
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ComputerGamePage() {
    const navigate = useNavigate();
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [config, setConfig] = useState(null); // null = show setup
    const [showGameOver, setShowGameOver] = useState(true);

    const timed = config?.timeControl?.initial > 0 ? config.timeControl : null;

    const game = useComputerGame(
        config?.color ?? 'white',
        config?.depth ?? 12,
        timed
    );

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };

    const handleStart = (cfg) => {
        setConfig(cfg);
        setShowGameOver(true);
    };

    const handleReset = () => {
        game.reset();
        setShowGameOver(true);
    };

    const computerColor = config?.color === 'white' ? 'black' : 'white';
    const diffLabel = DIFFICULTY_LEVELS.find(d => d.depth === config?.depth)?.label ?? '';

    return (
        <div className="cpu-page">
            {/* Top Bar */}
            <header className="cpu-topbar">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
                    <ArrowLeft size={18} />
                    Home
                </button>
                <span className="cpu-topbar-title">
                    <Bot size={18} />
                    vs Computer
                </span>
                <button className="btn btn-ghost btn-icon" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </header>

            {/* Setup screen overlay */}
            {!config && <SetupScreen onStart={handleStart} />}

            {config && (
                <div className="cpu-layout">
                    {/* Left Sidebar */}
                    <aside className="cpu-sidebar glass">
                        {/* Profiles */}
                        <div className="cpu-profile-section">
                            {/* Computer profile */}
                            <div className="cpu-profile-row">
                                <div className="cpu-profile-info">
                                    <span className="cpu-role">Computer</span>
                                    <div className="nametag-pill">
                                        <Bot size={13} />
                                        <span className="name">Stockfish</span>
                                        <span className="cpu-difficulty-badge">{diffLabel}</span>
                                    </div>
                                </div>
                                <div className="profile-right">
                                    <ChessClock
                                        time={game.clocks[computerColor]}
                                        isActive={game.turn === computerColor && !game.isEnded}
                                        isPaused={game.isThinking}
                                        isEnded={game.isEnded}
                                        timeControl={timed}
                                    />
                                    <span className={`color-indicator ${computerColor}`} />
                                </div>
                            </div>

                            <div className="profile-divider"></div>

                            {/* Player profile */}
                            <div className="cpu-profile-row">
                                <div className="cpu-profile-info">
                                    <span className="cpu-role">You</span>
                                    <div className="nametag-pill">
                                        <User size={13} />
                                        <span className="name">Player</span>
                                    </div>
                                </div>
                                <div className="profile-right">
                                    <ChessClock
                                        time={game.clocks[config.color]}
                                        isActive={game.turn === config.color && !game.isEnded}
                                        isEnded={game.isEnded}
                                        timeControl={timed}
                                    />
                                    <span className={`color-indicator ${config.color}`} />
                                </div>
                            </div>
                        </div>

                        {/* Move list */}
                        <div className="cpu-moves-wrapper">
                            <MoveList moves={game.moves} />
                        </div>

                        {/* Actions */}
                        <div className="cpu-actions">
                            <button className="btn btn-secondary" onClick={handleReset}>
                                <RotateCcw size={15} />
                                New Game
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={game.resign}
                                disabled={game.isEnded}
                            >
                                <Flag size={15} />
                                Resign
                            </button>
                        </div>
                    </aside>

                    {/* Board Area */}
                    <main className="cpu-main">
                        <div className="board-centering-container">
                            {/* Top bar: Computer */}
                            <div className="board-player-bar top">
                                <div className="player-bar-info">
                                    <Bot size={14} />
                                    <span className="player-bar-name">
                                        Stockfish ({diffLabel})
                                    </span>
                                    <span className={`color-indicator ${computerColor}`} />
                                    {game.isThinking && (
                                        <span className="thinking-badge">Thinking...</span>
                                    )}
                                </div>
                                <ChessClock
                                    time={game.clocks[computerColor]}
                                    isActive={game.turn === computerColor && !game.isEnded}
                                    isPaused={game.isThinking}
                                    isEnded={game.isEnded}
                                    timeControl={timed}
                                />
                            </div>

                            <ChessBoard
                                fen={game.fen}
                                playerColor={config.color}
                                onMove={game.makeMove}
                                isMyTurn={game.turn === config.color && !game.isThinking}
                                isGameStarted={game.isStarted}
                                isGameEnded={game.isEnded}
                                lastMove={game.moves[game.moves.length - 1]}
                                isCheck={game.isCheck}
                                opponentConnected={true}
                            />

                            {/* Bottom bar: Player */}
                            <div className="board-player-bar bottom">
                                <div className="player-bar-info">
                                    <User size={14} />
                                    <span className="player-bar-name">
                                        You ({config.color})
                                    </span>
                                    <span className={`color-indicator ${config.color}`} />
                                </div>
                                <ChessClock
                                    time={game.clocks[config.color]}
                                    isActive={game.turn === config.color && !game.isEnded}
                                    isEnded={game.isEnded}
                                    timeControl={timed}
                                />
                            </div>
                        </div>
                    </main>
                </div>
            )}

            {/* Game over modal */}
            {game.isEnded && showGameOver && (
                <GameOverModal
                    result={game.result}
                    playerColor={config?.color ?? 'white'}
                    pgn={game.pgn}
                    onRematch={handleReset}
                    onLeave={() => navigate('/')}
                    onClose={() => setShowGameOver(false)}
                    pendingRematch={false}
                    rematchRequested={false}
                />
            )}
        </div>
    );
}
