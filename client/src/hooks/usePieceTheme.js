import { useState, useCallback } from 'react';

export function usePieceTheme() {
    const [pieceTheme, setPieceTheme] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                return localStorage.getItem('pieceTheme') || 'classic';
            }
        } catch (e) {}
        return 'classic';
    });

    const togglePieceTheme = useCallback(() => {
        setPieceTheme(prev => {
            const next = prev === 'classic' ? 'numeric' : 'classic';
            try {
                localStorage.setItem('pieceTheme', next);
            } catch (e) {}
            return next;
        });
    }, []);

    return { pieceTheme, togglePieceTheme, setPieceTheme };
}
