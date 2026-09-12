import { useState, useEffect, useCallback } from 'react';
import { X, Clock, Calculator } from 'lucide-react';
import './MathChallengeModal.css';

// Generate random math problem
function generateProblem() {
    const operations = ['+', '-'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let a, b, answer;
    
    if (op === '+') {
        a = Math.floor(Math.random() * 90) + 10; // 10-99
        b = Math.floor(Math.random() * 90) + 10;
        answer = a + b;
    } else {
        a = Math.floor(Math.random() * 90) + 10;
        b = Math.floor(Math.random() * a) + 1; // Ensure positive result
        answer = a - b;
    }
    
    return { question: `${a} ${op} ${b}`, answer };
}

export default function MathChallengeModal({ onSuccess, onFail, onClose }) {
    const [problem] = useState(() => generateProblem());
    const [userAnswer, setUserAnswer] = useState('');
    const [timeLeft, setTimeLeft] = useState(15);
    const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'fail' | 'timeout'

    // Countdown timer
    useEffect(() => {
        if (status !== 'pending') return;
        
        if (timeLeft <= 0) {
            setStatus('timeout');
            setTimeout(() => {
                onFail?.();
                onClose?.();
            }, 1500);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, status, onFail, onClose]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (status !== 'pending') return;

        const parsedAnswer = parseInt(userAnswer, 10);
        
        if (parsedAnswer === problem.answer) {
            setStatus('success');
            setTimeout(() => {
                onSuccess?.();
                onClose?.();
            }, 800);
        } else {
            setStatus('fail');
            setTimeout(() => {
                onFail?.();
                onClose?.();
            }, 1500);
        }
    }, [userAnswer, problem.answer, status, onSuccess, onFail, onClose]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onFail?.();
            onClose?.();
        }
    };

    return (
        <div className="modal-overlay math-challenge-overlay" onKeyDown={handleKeyDown}>
            <div className="modal math-challenge-modal">
                <div className="modal-header">
                    <div className="modal-title-row">
                        <Calculator size={20} />
                        <h2 className="modal-title">Solve to Get Hint</h2>
                    </div>
                    <button 
                        className="modal-close" 
                        onClick={() => { onFail?.(); onClose?.(); }}
                        disabled={status !== 'pending'}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Timer */}
                    <div className={`challenge-timer ${timeLeft <= 5 ? 'warning' : ''}`}>
                        <Clock size={16} />
                        <span>{timeLeft}s</span>
                    </div>

                    {/* Problem Display */}
                    <div className="challenge-problem">
                        <span className="problem-text">{problem.question} = ?</span>
                    </div>

                    {/* Status Messages */}
                    {status === 'success' && (
                        <div className="challenge-status success">
                            ✓ Correct! Loading hint...
                        </div>
                    )}
                    {status === 'fail' && (
                        <div className="challenge-status fail">
                            ✗ Wrong answer!
                        </div>
                    )}
                    {status === 'timeout' && (
                        <div className="challenge-status timeout">
                            ⏱ Time's up!
                        </div>
                    )}

                    {/* Input Form */}
                    {status === 'pending' && (
                        <form onSubmit={handleSubmit} className="challenge-form">
                            <input
                                type="number"
                                className="input challenge-input"
                                placeholder="Your answer"
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                autoFocus
                            />
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={!userAnswer}
                            >
                                Submit
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
