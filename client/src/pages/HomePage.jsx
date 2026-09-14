import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    LogIn,
    Zap,
    MessageSquare,
    Lock,
    Heart,
    Sun,
    Moon,
    Crown,
    Users,
    RefreshCw,
    LockOpen,
    Clock,
    Bot
} from 'lucide-react';
import { useChessSocket } from '../hooks/useChessSocket';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import './HomePage.css';

export default function HomePage() {
    const navigate = useNavigate();
    const { connected, createRoom, joinRoom, getRooms, error, clearError, setCallbacks } = useChessSocket();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Fetch rooms on mount and periodically
    useEffect(() => {
        if (connected) {
            handleRefreshRooms();
            const interval = setInterval(handleRefreshRooms, 10000); // Refresh every 10s
            return () => clearInterval(interval);
        }
    }, [connected]);

    setCallbacks({
        onRoomCreated: (data) => {
            setIsLoading(false);
            navigate(`/room/${data.roomCode}`);
        },
        onJoined: (data) => {
            setIsLoading(false);
            setSelectedRoom(null);
            navigate(`/room/${data.roomCode}`);
        },
        onJoinError: () => {
            setIsLoading(false);
        },
        onRoomsList: (data) => {
            setRooms(data);
            setRoomsLoading(false);
        }
    });

    const handleRefreshRooms = () => {
        setRoomsLoading(true);
        getRooms();
    };

    const handleCreateRoom = (name, password, roomName, timeControl) => {
        setIsLoading(true);
        clearError();
        createRoom(name, password, roomName, timeControl);
    };

    const handleJoinRoom = (code, name, password) => {
        setIsLoading(true);
        clearError();
        joinRoom(code, name, password);
    };

    const handleQuickJoin = (room) => {
        if (room.hasPassword) {
            setSelectedRoom(room);
            setShowJoinModal(true);
        } else {
            // For public rooms, show join modal to enter name
            setSelectedRoom(room);
            setShowJoinModal(true);
        }
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="home-page">
            <button className="theme-toggle btn btn-ghost btn-icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <main className="home-content">
                <header className="home-header">
                    <div className="logo">
                        <Crown className="logo-icon" size={40} strokeWidth={1.5} />
                        <h1>Indie Chess</h1>
                    </div>
                    <p className="tagline">Real-time multiplayer chess. Play with friends anywhere.</p>

                    <div className="connection-status">
                        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
                        <span>{connected ? 'Connected' : 'Connecting...'}</span>
                    </div>
                </header>

                <div className="action-cards">
                    <button
                        className="action-card glass"
                        onClick={() => setShowCreateModal(true)}
                        disabled={!connected}
                    >
                        <Plus className="card-icon" size={32} />
                        <h3>Create Room</h3>
                        <p>Start a new game and invite a friend</p>
                    </button>

                    <button
                        className="action-card glass"
                        onClick={() => {
                            setSelectedRoom(null);
                            setShowJoinModal(true);
                        }}
                        disabled={!connected}
                    >
                        <LogIn className="card-icon" size={32} />
                        <h3>Join Room</h3>
                        <p>Enter a room code to join a game</p>
                    </button>

                    <button
                        className="action-card glass action-card-cpu"
                        onClick={() => navigate('/computer')}
                    >
                        <Bot className="card-icon" size={32} />
                        <h3>vs Computer</h3>
                        <p>Play offline against Stockfish</p>
                    </button>
                </div>

                {/* Room List */}
                <div className="room-list-section">
                    <div className="room-list-header">
                        <h2>Available Rooms</h2>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleRefreshRooms}
                            disabled={roomsLoading}
                        >
                            <RefreshCw size={16} className={roomsLoading ? 'spinning' : ''} />
                            Refresh
                        </button>
                    </div>

                    {rooms.length === 0 ? (
                        <div className="room-list-empty">
                            <p>No rooms available. Create one to start playing!</p>
                        </div>
                    ) : (
                        <div className="room-list">
                            {rooms.map(room => (
                                <div key={room.code} className="room-item glass">
                                    <div className="room-info">
                                        <div className="room-name">
                                            {room.hasPassword ? <Lock size={14} /> : <LockOpen size={14} />}
                                            <span>{room.name}</span>
                                        </div>
                                        <div className="room-meta">
                                            <span className="room-code">{room.code}</span>
                                            {room.timeControl && (
                                                <span className="room-time" title={room.timeControl.name}>
                                                    <Clock size={12} />
                                                    {room.timeControl.name}
                                                </span>
                                            )}
                                            <span className="room-players">
                                                <Users size={12} />
                                                {room.playerCount}/{room.maxPlayers}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleQuickJoin(room)}
                                        disabled={isLoading}
                                    >
                                        Join
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="features">
                    <div className="feature">
                        <Zap size={16} />
                        <span>Real-time moves</span>
                    </div>
                    <div className="feature">
                        <MessageSquare size={16} />
                        <span>In-game chat</span>
                    </div>
                    <div className="feature">
                        <Lock size={16} />
                        <span>Private rooms</span>
                    </div>
                </div>
            </main>

            <footer className="home-footer">
                <p>
                    Built with <Heart size={14} className="heart-icon" /> Summer by{' '}
                    <a href="https://github.com/yunkhngn" target="_blank" rel="noopener noreferrer">
                        yunkhngn
                    </a>
                </p>
            </footer>

            {showCreateModal && (
                <CreateRoomModal
                    onClose={() => {
                        setShowCreateModal(false);
                        clearError();
                    }}
                    onSubmit={handleCreateRoom}
                    isLoading={isLoading}
                    error={error}
                />
            )}

            {showJoinModal && (
                <JoinRoomModal
                    onClose={() => {
                        setShowJoinModal(false);
                        setSelectedRoom(null);
                        clearError();
                    }}
                    onSubmit={handleJoinRoom}
                    isLoading={isLoading}
                    error={error}
                    prefilledCode={selectedRoom?.code}
                    requiresPassword={selectedRoom?.hasPassword}
                />
            )}
        </div>
    );
}
