import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RoomPage from './pages/RoomPage'
import ComputerGamePage from './pages/ComputerGamePage'

function App() {
    return (
        <div className="app">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/room/:roomCode" element={<RoomPage />} />
                <Route path="/computer" element={<ComputerGamePage />} />
            </Routes>
        </div>
    )
}

export default App
