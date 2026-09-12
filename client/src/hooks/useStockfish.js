import { useState, useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
    const [engine, setEngine] = useState(null);
    const [isThinking, setIsThinking] = useState(false);
    const [bestMove, setBestMove] = useState(null);
    const [engineReady, setEngineReady] = useState(false);

    useEffect(() => {
        // Initialize worker
        let worker;
        try {
            worker = new Worker('/stockfish/stockfish.js');
            worker.onmessage = (event) => {
                const line = event.data;
                if (line === 'uciok') {
                    setEngineReady(true);
                }
                if (line.startsWith('bestmove')) {
                    const move = line.split(' ')[1];
                    setBestMove(move);
                    setIsThinking(false);
                }
            };
            worker.postMessage('uci');
            setEngine(worker);
        } catch (err) {
            console.error('Failed to init Stockfish worker:', err);
        }

        return () => {
            if (worker) worker.terminate();
        };
    }, []);

    const findBestMove = useCallback((fen, depth = 15) => {
        if (!engine || !engineReady) return;

        setIsThinking(true);
        setBestMove(null);
        
        engine.postMessage(`position fen ${fen}`);
        engine.postMessage(`go depth ${depth}`);
    }, [engine, engineReady]);

    const stop = useCallback(() => {
        if (engine) {
            engine.postMessage('stop');
            setIsThinking(false);
        }
    }, [engine]);

    return {
        findBestMove,
        stop,
        bestMove,
        isThinking,
        engineReady
    };
}
