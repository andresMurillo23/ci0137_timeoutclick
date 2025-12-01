/**
 * MongoDB Database Initialization Script
 * Creates collections and indexes for TimeoutClick
 */

// Connect to the database
const db = db.getSiblingDB('timeoutclick');

print('Initializing TimeoutClick Database...\n');

// Create collections with validation and indexes
print('Creating collections...\n');

// 1. USERS COLLECTION
print('Creating users collection with indexes...');
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'password'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 20,
          description: 'Username must be a string between 3-20 characters'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'Must be a valid email address'
        },
        password: {
          bsonType: 'string',
          minLength: 6,
          description: 'Password must be at least 6 characters'
        }
      }
    }
  }
});

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ 'gameStats.totalScore': -1 });
db.users.createIndex({ lastActive: -1 });
db.users.createIndex({ status: 1 });
print('[OK] Users collection created\n');

// 2. GAMES COLLECTION
print('Creating games collection with indexes...');
db.createCollection('games');

db.games.createIndex({ player1: 1, status: 1 });
db.games.createIndex({ player2: 1, status: 1 });
db.games.createIndex({ status: 1, createdAt: -1 });
db.games.createIndex({ gameType: 1, status: 1 });
db.games.createIndex({ winner: 1 });
db.games.createIndex({ createdAt: -1 });
print('[OK] Games collection created\n');

// 3. GAMESESSIONS COLLECTION
print('Creating gamesessions collection with indexes...');
db.createCollection('gamesessions');

db.gamesessions.createIndex({ gameId: 1 }, { unique: true });
db.gamesessions.createIndex({ player1SocketId: 1 });
db.gamesessions.createIndex({ player2SocketId: 1 });
db.gamesessions.createIndex({ gameState: 1, lastActivity: -1 });
// TTL index - automatically delete sessions after 1 hour of inactivity
db.gamesessions.createIndex({ lastActivity: 1 }, { expireAfterSeconds: 3600 });
print('[OK] GameSessions collection created\n');

// 4. FRIENDSHIPS COLLECTION
print('Creating friendships collection with indexes...');
db.createCollection('friendships');

db.friendships.createIndex({ user1: 1, user2: 1 }, { unique: true });
db.friendships.createIndex({ user1: 1, status: 1 });
db.friendships.createIndex({ user2: 1, status: 1 });
db.friendships.createIndex({ createdAt: -1 });
print('[OK] Friendships collection created\n');

// 5. INVITATIONS COLLECTION
print('Creating invitations collection with indexes...');
db.createCollection('invitations');

db.invitations.createIndex({ receiver: 1, status: 1 });
db.invitations.createIndex({ sender: 1, status: 1 });
db.invitations.createIndex({ sender: 1, receiver: 1, type: 1 });
// TTL index - automatically delete expired invitations
db.invitations.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.invitations.createIndex({ createdAt: -1 });
print('[OK] Invitations collection created\n');

// 6. SESSIONS COLLECTION (for express-session with connect-mongo)
print('Creating sessions collection...');
db.createCollection('sessions');
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
print('[OK] Sessions collection created\n');

// Insert a test user (optional)
print('Creating test user (optional)...');
const testUser = {
  username: 'testuser',
  email: 'test@timeoutclick.com',
  password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIvAprzO3.', // password: "test123"
  avatar: null,
  isEmailVerified: true,
  emailVerificationToken: null,
  resetPasswordToken: null,
  resetPasswordExpires: null,
  profile: {
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: null,
    country: 'Test Country'
  },
  gameStats: {
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    bestTime: null,
    averageTime: 0
  },
  settings: {
    notifications: true,
    soundEnabled: true,
    theme: 'light'
  },
  status: 'active',
  lastActive: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

try {
  db.users.insertOne(testUser);
  print('[OK] Test user created (username: testuser, password: test123)\n');
} catch (error) {
  print('[WARN] Test user already exists or could not be created\n');
}

// Show collection stats
print('\nDatabase Statistics:\n');
print('Collections:');
db.getCollectionNames().forEach(function(collection) {
  const count = db.getCollection(collection).countDocuments();
  print(`  - ${collection}: ${count} documents`);
});

print('\n[OK] Database initialization completed successfully!');
print('\nConnection string: mongodb://localhost:27017/timeoutclick');
print('Test credentials: testuser / test123\n');
