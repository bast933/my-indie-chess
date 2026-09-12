import { Clock } from 'lucide-react';
import './ChessClock.css';

export default function ChessClock({
    time,
    isActive = false,
    isPaused = false,
    isEnded = false,
    timeControl = null,
    className = ''
}) {
    // If unlimited / no clock set
    if (timeControl && timeControl.initial === 0) {
        return (
            <div className={`chess-clock-pill unlimited ${className}`}>
                <Clock size={15} />
                <span className="clock-digits">∞</span>
            </div>
        );
    }

    const safeTime = typeof time === 'number' ? Math.max(0, time) : 0;
    const totalSeconds = Math.floor(safeTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const isLow = safeTime > 0 && safeTime <= 30000;
    const isCritical = safeTime > 0 && safeTime <= 10000;
    const isExpired = safeTime <= 0;

    const stateClasses = [
        isActive && !isEnded && !isPaused ? 'active' : '',
        isLow ? 'low-time' : '',
        isCritical ? 'critical-time' : '',
        isExpired ? 'expired' : '',
        isPaused ? 'paused' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={`chess-clock-pill ${stateClasses}`}>
            <Clock size={15} className="clock-icon" />
            <span className="clock-digits">{formattedTime}</span>
        </div>
    );
}
