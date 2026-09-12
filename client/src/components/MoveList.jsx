import { useEffect, useRef } from 'react';
import './MoveList.css';

export default function MoveList({ moves }) {
    const listRef = useRef(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [moves]);

    const movePairs = [];
    for (let i = 0; i < moves.length; i += 2) {
        movePairs.push({
            number: Math.floor(i / 2) + 1,
            white: moves[i],
            black: moves[i + 1]
        });
    }

    return (
        <div className="move-list card">
            <div className="card-header">
                <h3 className="card-title">Moves</h3>
                <span className="move-count">{moves.length}</span>
            </div>

            <div className="moves-container" ref={listRef}>
                {movePairs.length === 0 ? (
                    <div className="no-moves">Game will begin when opponent joins</div>
                ) : (
                    <table className="moves-table">
                        <tbody>
                            {movePairs.map((pair) => (
                                <tr key={pair.number} className="move-row">
                                    <td className="move-number">{pair.number}.</td>
                                    <td className={`move white-move ${!pair.black ? 'latest' : ''}`}>
                                        {pair.white?.san}
                                    </td>
                                    <td className={`move black-move ${pair.black ? 'latest' : ''}`}>
                                        {pair.black?.san || ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
