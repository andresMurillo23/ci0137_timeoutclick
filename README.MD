# TimeoutClick

A real-time multiplayer web game where players compete in precision timing challenges. Built with Node.js, Express, MongoDB, and Socket.IO.

## Overview

TimeoutClick is a reaction-based multiplayer game where players must click as close as possible to a randomly generated target time. Players can challenge friends, compete in tournaments, and track their performance through comprehensive statistics.

## Key Features

- **User Management**: Registration, login, profile management with avatar upload
- **Friend System**: Send invitations, manage friendships, and challenge friends
- **Real-Time Gameplay**: Socket.IO-powered multiplayer matches with instant synchronization
- **Guest Mode**: Play without registration against registered users
- **Statistics**: Game history, global rankings, and detailed player profiles
- **Email Integration**: Account verification and password recovery
- **Best of 3 System**: Games consist of 3 rounds with rematch functionality

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- Socket.IO for real-time communication
- Express-session with connect-mongo for session management
- Bcrypt for password hashing
- Joi for validation
- Nodemailer for email services
- Multer for file uploads

### Frontend
- Vanilla JavaScript (no frameworks)
- Socket.IO Client
- Modular CSS with custom properties
- MVC-like file structure

## Project Structure

```
ci0137_timeoutclick/
├── backend/
│   ├── server.js              # Entry point
│   ├── config/                # Database and session config
│   ├── controllers/           # Business logic (auth, games, friends, users)
│   ├── models/                # Mongoose schemas (User, Game, Friendship, etc.)
│   ├── routes/                # REST API routes
│   ├── socket/                # Socket.IO game handlers
│   ├── middleware/            # Auth, validation, error handling
│   └── utils/                 # Helper functions
├── frontend/
│   ├── server.js              # Static file server
│   └── public/
│       ├── pages/             # HTML pages
│       ├── css/               # Stylesheets
│       └── js/
│           ├── pages/         # Page controllers
│           ├── partials/      # Reusable components
│           └── utils/         # Utility functions
└── package.json               # Root scripts
```

## Prerequisites

- Node.js 14+
- MongoDB
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/andresMurillo23/ci0137_timeoutclick.git
cd ci0137_timeoutclick
```

2. Install all dependencies:
```bash
npm run install:all
```

## Running the Application

### Quick Start (Recommended) - Complete Setup from Scratch

For a fresh installation that sets up everything automatically:

**Windows (PowerShell):**
```powershell
.\setup-and-run.ps1
```

**Windows (Command Prompt):**
```bash
setup-and-run.bat
```

This script will:
1. Check and start MongoDB service
2. Install all dependencies (root, backend, frontend)
3. Create `.env` file with default configuration
4. Initialize database with sample users
5. Start both backend and frontend servers

### Option 1: Start Servers Only (After Setup)

If dependencies are already installed:

```bash
start-servers.bat
```

### Option 2: Development Mode
```bash
npm run dev
```

### Option 3: Manual Start

Backend:
```bash
cd backend
npm start
```

Frontend (separate terminal):
```bash
cd frontend
npm start
```

Access the application:
- Frontend: http://localhost:5000
- Backend API: http://localhost:3000

Public deployment:
- Frontend: https://ci0137-timeoutclick.vercel.app/pages/home.html

## Core Functionality

### Authentication
- User registration with email verification
- Session-based login system
- Password recovery via email
- Profile editing with avatar upload

### Friend Management
- Search and send friend requests
- Accept or decline invitations
- View friends list with online status
- Access friend profiles and statistics

### Gameplay
- **Challenge Mode**: Invite friends to 1v1 matches (best of 3)
- **Guest Mode**: Play without account registration
- **Random Goal Time**: Target between 5-10 seconds generated per round
- **Real-Time Sync**: Socket.IO ensures instant updates for both players
- **Round System**: First to win 2 rounds wins the match
- **Rematch**: Request immediate rematches after game completion

### Statistics & Rankings
- Complete game history with detailed round information
- Global leaderboard sorted by win rate and accuracy
- Personal stats: W/L ratio, average reaction time, accuracy
- Friend comparisons and performance tracking

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Create new account
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /verify-email/:token` - Email verification
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password

### Users (`/api/users`)
- `GET /profile` - Get current user profile
- `PUT /profile` - Update profile
- `POST /avatar` - Upload avatar image
- `GET /search?q=query` - Search users
- `GET /:id` - View user public profile

### Friends (`/api/friends`)
- `GET /` - Get friends list
- `POST /invite` - Send friend request
- `GET /invitations` - Get pending invitations
- `POST /accept/:id` - Accept invitation
- `POST /reject/:id` - Reject invitation
- `DELETE /:id` - Remove friend

### Games (`/api/games`)
- `POST /challenge` - Create game challenge
- `GET /history` - Get game history
- `GET /active` - Get active game
- `GET /ranking` - Get global ranking
- `GET /:id` - Get game details

### Socket.IO Events
- `join_game` - Join game room
- `player_click` - Record player click time
- `player_ready_for_next_round` - Ready for next round
- `challenge_accepted` - Accept game challenge
- `challenge_declined` - Decline challenge
- `rematch_request` - Request rematch
- `rematch_response` - Respond to rematch
- `leave_game` - Leave game

## Database Models

- **User**: Authentication, profile, statistics
- **Friendship**: Bidirectional friend relationships
- **Invitation**: Pending friend requests
- **Game**: Match data and results
- **GameSession**: Detailed round-by-round history

## Development Scripts

### Root Level
- `npm run dev` - Run both servers in development mode
- `npm run install:all` - Install all dependencies
- `npm start` - Start backend only

### Backend
- `npm start` - Production server
- `npm run dev` - Development with nodemon

### Frontend
- `npm start` - Static file server


## Deployment

Configured for deployment on:
- **Frontend**: Vercel
- **Backend**: Ngrok
- **Database**: MongoDB 


## License

Open source for educational purposes - Universidad de Costa Rica, CI0137 course. 