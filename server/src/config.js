export const TIME_CONTROLS = {
  'bullet_1_0': { name: 'Bullet 1+0', initial: 1 * 60 * 1000, increment: 0 },
  'bullet_2_1': { name: 'Bullet 2+1', initial: 2 * 60 * 1000, increment: 1000 },
  'blitz_3_0': { name: 'Blitz 3+0', initial: 3 * 60 * 1000, increment: 0 },
  'blitz_5_0': { name: 'Blitz 5+0', initial: 5 * 60 * 1000, increment: 0 },
  'blitz_5_3': { name: 'Blitz 5+3', initial: 5 * 60 * 1000, increment: 3000 },
  'rapid_10_0': { name: 'Rapid 10+0', initial: 10 * 60 * 1000, increment: 0 },
  'rapid_10_5': { name: 'Rapid 10+5', initial: 10 * 60 * 1000, increment: 5000 },
  'rapid_15_10': { name: 'Rapid 15+10', initial: 15 * 60 * 1000, increment: 10000 },
  'classical_30_0': { name: 'Classical 30+0', initial: 30 * 60 * 1000, increment: 0 },
  'unlimited': { name: 'Unlimited', initial: 0, increment: 0 }
};

export const config = {
  port: process.env.PORT || 3002,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  pgnDirectory: process.env.PGN_DIR || './pgn',
  
  defaultTimeControl: {
    name: 'Rapid 10+0',
    initial: 10 * 60 * 1000,
    increment: 0
  },
  
  roomCodeLength: 6,
  maxRoomsPerIP: 5,
  roomExpiryTime: 24 * 60 * 60 * 1000,
  
  reconnectWindow: 1 * 60 * 1000
};

