const mongoose = require('mongoose');
const User = require('../models/User');
const { hashPassword } = require('../utils/bcrypt');
require('dotenv').config();

const sampleUsers = [
  {
    username: 'testuser',
    email: 'test@timeoutclick.com',
    password: 'test123',
    profile: {
      firstName: 'Test',
      lastName: 'User',
      country: 'Costa Rica'
    }
  },
  {
    username: 'andresmimi',
    email: 'andres@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Andres',
      lastName: 'Mendez',
      country: 'Costa Rica'
    }
  },
  {
    username: 'rolipoli',
    email: 'roli@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Rolando',
      lastName: 'Gomez',
      country: 'Costa Rica'
    }
  },
  {
    username: 'isabel',
    email: 'isabel@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Isabel',
      lastName: 'Rodriguez',
      country: 'Costa Rica'
    }
  },
  {
    username: 'tatsparamo',
    email: 'tats@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Tatiana',
      lastName: 'Paramo',
      country: 'Costa Rica'
    }
  },
  {
    username: 'mariagu',
    email: 'maria@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Maria',
      lastName: 'Gutierrez',
      country: 'Costa Rica'
    }
  },
  {
    username: 'carlos99',
    email: 'carlos@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Carlos',
      lastName: 'Vargas',
      country: 'Costa Rica'
    }
  },
  {
    username: 'luisa_k',
    email: 'luisa@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Luisa',
      lastName: 'Keller',
      country: 'Costa Rica'
    }
  },
  {
    username: 'juan_g',
    email: 'juan@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Juan',
      lastName: 'Gonzalez',
      country: 'Costa Rica'
    }
  },
  {
    username: 'maria89',
    email: 'maria89@timeoutclick.com',
    password: 'password123',
    profile: {
      firstName: 'Maria',
      lastName: 'Lopez',
      country: 'Costa Rica'
    }
  }
];

async function seedUsers() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/timeoutclick';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    console.log('\nChecking existing users...');
    const existingCount = await User.countDocuments();
    console.log(`Found ${existingCount} existing users`);

    let created = 0;
    let skipped = 0;

    for (const userData of sampleUsers) {
      const exists = await User.findOne({
        $or: [
          { email: userData.email.toLowerCase() },
          { username: userData.username.toLowerCase() }
        ]
      });

      if (exists) {
        console.log(`- Skipping ${userData.username} (already exists)`);
        skipped++;
        continue;
      }

      const hashedPassword = await hashPassword(userData.password);
      
      const user = new User({
        username: userData.username.toLowerCase(),
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        profile: userData.profile,
        isEmailVerified: true,
        gameStats: {
          gamesPlayed: Math.floor(Math.random() * 50),
          gamesWon: Math.floor(Math.random() * 30),
          totalScore: Math.floor(Math.random() * 1000),
          bestTime: (Math.random() * 5 + 1).toFixed(2),
          averageTime: (Math.random() * 3 + 2).toFixed(2)
        }
      });

      await user.save();
      console.log(`+ Created ${userData.username}`);
      created++;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Created: ${created} users`);
    console.log(`Skipped: ${skipped} users`);
    console.log(`Total in DB: ${await User.countDocuments()} users`);
    console.log('\nAll users have password: password123 (except testuser: test123)');

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
