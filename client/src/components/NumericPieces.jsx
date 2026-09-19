import React from 'react';

/**
 * Renders SVG pieces based on the theoretical point values of chess:
 * - Pawn: 1
 * - Knight: Ɛ (mirrored 3, worth 3 points like bishop but visually mirrored)
 * - Bishop: 3
 * - Rook: 5
 * - Queen: 9
 * - King: ∞ (infinity)
 */
function renderNumericPiece(symbol, isWhite, squareWidth, isMirrored = false) {
    const textColor = isWhite ? '#FFFFFF' : '#181818';
    const textStroke = isWhite ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.4)';
    const strokeWidth = isWhite ? '2.5' : '1.8';

    return (
        <svg
            viewBox="0 0 100 100"
            width={squareWidth}
            height={squareWidth}
            style={{
                display: 'block',
                userSelect: 'none',
                filter: isWhite
                    ? 'drop-shadow(0 3px 4px rgba(0, 0, 0, 0.5))'
                    : 'drop-shadow(0 3px 4px rgba(0, 0, 0, 0.35))'
            }}
        >
            <text
                x="50"
                y="54"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={symbol === '∞' ? '66' : '74'}
                fontWeight="900"
                fontFamily="'Inter', 'Arial Black', -apple-system, sans-serif"
                fill={textColor}
                stroke={textStroke}
                strokeWidth={strokeWidth}
                paintOrder="stroke fill"
                transform={isMirrored ? 'translate(50, 0) scale(-1, 1) translate(-50, 0)' : undefined}
            >
                {symbol}
            </text>
        </svg>
    );
}

export const numericPieces = {
    wP: ({ squareWidth }) => renderNumericPiece('1', true, squareWidth),
    wN: ({ squareWidth }) => renderNumericPiece('3', true, squareWidth, true),
    wB: ({ squareWidth }) => renderNumericPiece('3', true, squareWidth, false),
    wR: ({ squareWidth }) => renderNumericPiece('5', true, squareWidth),
    wQ: ({ squareWidth }) => renderNumericPiece('9', true, squareWidth),
    wK: ({ squareWidth }) => renderNumericPiece('∞', true, squareWidth),
    bP: ({ squareWidth }) => renderNumericPiece('1', false, squareWidth),
    bN: ({ squareWidth }) => renderNumericPiece('3', false, squareWidth, true),
    bB: ({ squareWidth }) => renderNumericPiece('3', false, squareWidth, false),
    bR: ({ squareWidth }) => renderNumericPiece('5', false, squareWidth),
    bQ: ({ squareWidth }) => renderNumericPiece('9', false, squareWidth),
    bK: ({ squareWidth }) => renderNumericPiece('∞', false, squareWidth),
};
