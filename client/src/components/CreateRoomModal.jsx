import { useState } from 'react';
import { X, Loader2, Clock } from 'lucide-react';
import './CreateRoomModal.css';

const TIME_OPTIONS = [
    { id: 'rapid_10_0', name: 'Rapid 10+0', label: 'Rapid (10 min)' },
    { id: 'rapid_10_5', name: 'Rapid 10+5', label: 'Rapid (10 min + 5s)' },
    { id: 'rapid_15_10', name: 'Rapid 15+10', label: 'Rapid (15 min + 10s)' },
    { id: 'blitz_5_3', name: 'Blitz 5+3', label: 'Blitz (5 min + 3s)' },
    { id: 'blitz_5_0', name: 'Blitz 5+0', label: 'Blitz (5 min)' },
    { id: 'blitz_3_0', name: 'Blitz 3+0', label: 'Blitz (3 min)' },
    { id: 'bullet_2_1', name: 'Bullet 2+1', label: 'Bullet (2 min + 1s)' },
    { id: 'bullet_1_0', name: 'Bullet 1+0', label: 'Bullet (1 min)' },
    { id: 'classical_30_0', name: 'Classical 30+0', label: 'Classical (30 min)' },
    { id: 'unlimited', name: 'Unlimited', label: 'Unlimited (No clock)' }
];

const TIME_CONFIGS = {
    'rapid_10_0': { name: 'Rapid 10+0', initial: 10 * 60 * 1000, increment: 0 },
    'rapid_10_5': { name: 'Rapid 10+5', initial: 10 * 60 * 1000, increment: 5000 },
    'rapid_15_10': { name: 'Rapid 15+10', initial: 15 * 60 * 1000, increment: 10000 },
    'blitz_5_3': { name: 'Blitz 5+3', initial: 5 * 60 * 1000, increment: 3000 },
    'blitz_5_0': { name: 'Blitz 5+0', initial: 5 * 60 * 1000, increment: 0 },
    'blitz_3_0': { name: 'Blitz 3+0', initial: 3 * 60 * 1000, increment: 0 },
    'bullet_2_1': { name: 'Bullet 2+1', initial: 2 * 60 * 1000, increment: 1000 },
    'bullet_1_0': { name: 'Bullet 1+0', initial: 1 * 60 * 1000, increment: 0 },
    'classical_30_0': { name: 'Classical 30+0', initial: 30 * 60 * 1000, increment: 0 },
    'unlimited': { name: 'Unlimited', initial: 0, increment: 0 }
};

export default function CreateRoomModal({ onClose, onSubmit, isLoading, error }) {
    const [name, setName] = useState('');
    const [roomName, setRoomName] = useState('');
    const [timeControlId, setTimeControlId] = useState('rapid_10_0');
    const [password, setPassword] = useState('');
    const [usePassword, setUsePassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        const timeControl = TIME_CONFIGS[timeControlId] || TIME_CONFIGS['rapid_10_0'];
        onSubmit(name.trim(), usePassword ? password : null, roomName.trim() || null, timeControl);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal create-room-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Create Room</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="input-group">
                        <label className="input-label">Your Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={20}
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Room Name <span className="label-optional">(optional)</span></label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. Casual Game, Tournament Match..."
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            maxLength={30}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">
                            <span className="label-with-icon">
                                <Clock size={15} />
                                Time Control
                            </span>
                        </label>
                        <select
                            className="input select-input"
                            value={timeControlId}
                            onChange={(e) => setTimeControlId(e.target.value)}
                        >
                            {TIME_OPTIONS.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="password-toggle">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={usePassword}
                                onChange={(e) => setUsePassword(e.target.checked)}
                            />
                            <span className="checkbox-custom" />
                            <span>Private room (password protected)</span>
                        </label>
                    </div>

                    {usePassword && (
                        <div className="input-group">
                            <label className="input-label">Room Password</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!name.trim() || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="spinner" />
                                    Creating...
                                </>
                            ) : (
                                'Create Room'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
