// ============================================================
// IKEMEN GO NETPLAY PROFILE SERVER
// Host this on Replit (Node.js template)
// ============================================================

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store player profiles in memory
// Format: { visitorIp -> { sessionKey -> playerData } }
// We match players by WHO THEY'RE CONNECTING TO
const sessions = {};

// Clean up old sessions (older than 10 minutes)
function cleanupOldSessions() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const ip in sessions) {
        for (const key in sessions[ip]) {
            if (now - sessions[ip][key].timestamp > maxAge) {
                delete sessions[ip][key];
            }
        }
        if (Object.keys(sessions[ip]).length === 0) {
            delete sessions[ip];
        }
    }
}

// Run cleanup every minute
setInterval(cleanupOldSessions, 60000);

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Ikemen GO Profile Server',
        activeSessions: Object.keys(sessions).length
    });
});

// Register a player's profile
// POST /register
// Body: { hostIp, side, username, plateIndex, plateGroup, level }
app.post('/register', (req, res) => {
    const { hostIp, side, username, plateIndex, plateGroup, level } = req.body;
    
    if (!hostIp || !side) {
        return res.status(400).json({ error: 'Missing hostIp or side' });
    }
    
    // Initialize session storage for this host IP
    if (!sessions[hostIp]) {
        sessions[hostIp] = {};
    }
    
    // Store player data
    const playerKey = 'player' + side;
    sessions[hostIp][playerKey] = {
        username: username || 'Player ' + side,
        plateIndex: parseInt(plateIndex) || 1,
        plateGroup: parseInt(plateGroup) || 10,
        level: parseInt(level) || 1,
        side: parseInt(side),
        timestamp: Date.now()
    };
    
    console.log(`[REGISTER] Host: ${hostIp}, Side: ${side}, User: ${username}`);
    
    res.json({ 
        success: true, 
        registered: sessions[hostIp][playerKey]
    });
});

// Get opponent's profile
// GET /opponent?hostIp=xxx&mySide=1
app.get('/opponent', (req, res) => {
    const { hostIp, mySide } = req.query;
    
    if (!hostIp || !mySide) {
        return res.status(400).json({ error: 'Missing hostIp or mySide' });
    }
    
    const opponentSide = mySide === '1' ? '2' : '1';
    const opponentKey = 'player' + opponentSide;
    
    if (sessions[hostIp] && sessions[hostIp][opponentKey]) {
        console.log(`[FETCH] Host: ${hostIp}, Requesting side ${opponentSide} data`);
        res.json(sessions[hostIp][opponentKey]);
    } else {
        res.json(null);
    }
});

// Get both players (for debugging)
// GET /session?hostIp=xxx
app.get('/session', (req, res) => {
    const { hostIp } = req.query;
    
    if (!hostIp) {
        return res.status(400).json({ error: 'Missing hostIp' });
    }
    
    res.json(sessions[hostIp] || {});
});

// Clear a session (when match ends)
// POST /clear
app.post('/clear', (req, res) => {
    const { hostIp } = req.body;
    
    if (hostIp && sessions[hostIp]) {
        delete sessions[hostIp];
        console.log(`[CLEAR] Cleared session for host: ${hostIp}`);
    }
    
    res.json({ success: true });
});

// Debug: View all sessions
app.get('/debug/sessions', (req, res) => {
    res.json(sessions);
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Profile server running on port ${PORT}`);
});
