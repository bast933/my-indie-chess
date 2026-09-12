# Indie Chess

A real-time multiplayer chess application with room management, chat, and time controls.

![Indie Chess](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black) ![Docker](https://img.shields.io/badge/Docker-Compose-blue)

## Features

- **Real-time gameplay** - Instant move synchronization via WebSocket
- **Room management** - Create public or password-protected rooms
- **Chess clock** - Multiple time controls (Bullet, Blitz, Rapid, Classical)
- **In-game chat** - Communicate with your opponent
- **Move validation** - Server-side validation using chess.js
- **Reconnection support** - Rejoin games after disconnection
- **PGN export** - Download game notation
- **Responsive design** - Play on desktop or mobile

## Tech Stack

### Frontend
- React 18 + Vite
- react-chessboard
- Socket.IO Client
- React Router

### Backend
- Node.js + Express
- Socket.IO
- chess.js
- bcrypt (password hashing)

### Deployment
- Docker Compose
- Caddy (reverse proxy, HTTPS)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd indie-chess
   ```

2. **Start the backend**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Start the frontend** (in another terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```

4. **Open the app**
   
   Navigate to http://localhost:5173

### Using Docker (Development)

Run both frontend and backend with hot reloading:

```bash
docker-compose -f docker-compose.dev.yml up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3002

Stop with:
```bash
docker-compose -f docker-compose.dev.yml down
```

## Production Deployment

### Using Docker Compose

1. **Update configuration**
   
   Edit `Caddyfile` and replace `chess.yourdomain.com` with your domain.
   
   Edit `docker-compose.yml` and update `CORS_ORIGIN` environment variable.

2. **Build and start**
   ```bash
   docker-compose up -d --build
   ```

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop**
   ```bash
   docker-compose down
   ```

### DNS Configuration

Point your domain's A record to your VPS IP address. Caddy will automatically obtain and renew SSL certificates.

## Project Structure

```
indie-chess/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks (useChessSocket)
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS styles
│   ├── Dockerfile
│   └── nginx.conf
├── server/                 # Backend (Node.js + Socket.IO)
│   ├── src/
│   │   ├── index.js        # Express server
│   │   ├── config.js       # Configuration
│   │   ├── roomManager.js  # Room logic
│   │   ├── gameManager.js  # Game logic
│   │   └── socketHandlers.js # Socket events
│   └── Dockerfile
├── docker-compose.yml
├── Caddyfile
└── README.md
```

## Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create_room` | `{name, password?, timeControl?}` | Create a new room |
| `join_room` | `{roomCode, name, password?}` | Join existing room |
| `make_move` | `{from, to, promotion?}` | Make a chess move |
| `chat` | `{text}` | Send chat message |
| `request_restart` | - | Request game restart |
| `approve_restart` | - | Approve restart request |
| `request_color` | `{preferred}` | Request color swap |
| `resign` | - | Resign the game |
| `offer_draw` | - | Offer a draw |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room_created` | `{roomCode, playerId, color}` | Room created successfully |
| `joined` | `{roomCode, playerId, color, ...gameState}` | Joined room |
| `move_made` | `{san, fen, from, to, by, clocks}` | Move broadcast |
| `game_over` | `{result, pgn}` | Game ended |
| `chat_message` | `{from, text, timestamp}` | Chat message |
| `restart_request` | `{from}` | Restart requested |
| `game_restarted` | `{...gameState}` | Game restarted |

## Configuration

### Environment Variables (Backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `CORS_ORIGIN` | `*` | Allowed origins |
| `PGN_DIR` | `./pgn` | PGN save directory |

### Environment Variables (Frontend)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SOCKET_URL` | `` | Socket.IO server URL (empty for same origin) |

## Time Controls

Available time controls in the UI:

| Name | Initial | Increment |
|------|---------|-----------|
| Bullet 1+0 | 1 min | 0 sec |
| Bullet 2+1 | 2 min | 1 sec |
| Blitz 3+0 | 3 min | 0 sec |
| Blitz 5+0 | 5 min | 0 sec |
| Blitz 5+3 | 5 min | 3 sec |
| Rapid 10+0 | 10 min | 0 sec |
| Rapid 10+5 | 10 min | 5 sec |
| Rapid 15+10 | 15 min | 10 sec |
| Classical 30+0 | 30 min | 0 sec |

## Security Considerations

- Passwords are hashed using bcrypt
- Server is authoritative for all game logic
- Move validation prevents illegal moves
- Rooms expire after 24 hours
- Reconnection window is 5 minutes

## License

MIT
