# PixelBoard — Real-Time Infinite Pixel Grid

A real-time collaborative infinite canvas where users can claim cells and compete on a live leaderboard. Built with the MERN stack and Socket.IO.

---

## Features

### Core Canvas
- Infinite grid using viewport-based rendering  
- Smooth zoom and pan support (scroll, drag, pinch)  
- Real-time updates across clients using WebSockets  
- Lightweight animations for interactions  

### User System
- Email-based login  
- Each user gets a unique color  
- Token-based authentication  
- Session persists on reload  

### Leaderboard
- Real-time ranking updates  
- Displays user position even outside top ranks  
- Clean and minimal UI  

### Gameplay
- Click empty cells to claim them  
- Click your own cells to unclaim  
- Hover to view cell owner  
- Prevents duplicate claims using atomic operations  

### Performance
- Canvas-based rendering  
- Only visible cells are fetched and rendered  
- Debounced API calls to reduce load  
- Responsive across devices  

---

## Tech Stack

- Frontend: React + Vite  
- Styling: Tailwind CSS  
- Backend: Node.js + Express  
- Database: MongoDB  
- Real-time: Socket.IO  
- Authentication: Token-based  

---

## Getting Started

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Runs on: http://localhost:5000

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Runs on: http://localhost:5173

---

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/pixelboard
COOKIE_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```

---

## API Endpoints

### Authentication
- POST /api/register
- GET /api/me

### Data
- GET /api/cells?x1=&y1=&x2=&y2=
- GET /api/leaderboard

### WebSocket Events
- claim_cell  
- unclaim_cell  
- cell_updated  
- cell_removed  
- leaderboard_update  

---

## How It Works

- The grid is not stored entirely  
- Only claimed cells are saved in the database  
- Frontend requests cells based on current viewport  
- Coordinates (x, y) define each cell  
- Real-time sync is handled using Socket.IO  
