/**
 * Database Reset and Seed Script
 * 
 * This script drops all databases and recreates them with the correct schemas.
 * Run this when you need a fresh start with consistent schemas.
 * 
 * Usage: npm run db:reset
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Database URLs
const USER_DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/users';
const POST_DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/posts';
const COMMENT_DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/comments';

async function dropDatabase(dbUrl, dbName) {
  try {
    console.log(`🗑️  Dropping database: ${dbName}...`);
    await mongoose.connect(dbUrl);
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
    console.log(`✅ Database ${dbName} dropped successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ Error dropping ${dbName}:`, error.message);
    return false;
  }
}

async function seedUsers() {
  console.log('\n👤 Seeding Users database...');
  
  const User = mongoose.model('User', new mongoose.Schema({
    username: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      minlength: 3, 
      maxlength: 30 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      lowercase: true 
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 8
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }, { timestamps: false }));

  try {
    await mongoose.connect(USER_DB_URL);
    
    // Create test users
    const users = [
      {
        username: 'javier',
        email: 'javier@example.com',
        password: 'SecurePass123!'
      },
      {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!'
      },
      {
        username: 'demo',
        email: 'demo@example.com',
        password: 'DemoPass123!'
      }
    ];

    for (const userData of users) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      const user = new User({
        username: userData.username,
        email: userData.email,
        passwordHash
      });
      await user.save();
      console.log(`  ✅ Created user: ${userData.username} (${userData.email})`);
    }

    await mongoose.disconnect();
    console.log('✅ Users database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
  }
}

async function seedPosts() {
  console.log('\n📝 Seeding Posts database...');

  const Post = mongoose.model('Post', new mongoose.Schema({
    authorId: { type: String, required: true },
    author: { type: String, required: true },
    title: { type: String, required: true, minlength: 5, maxlength: 100 },
    body: { type: String, required: true, minlength: 10, maxlength: 5000 },
    createdAt: { type: Date, required: true, default: () => new Date() },
    updatedAt: { type: Date },
    commentCount: { type: Number, required: true, default: 0 },
    deleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
    authorDeleted: { type: Boolean },
    authorDeletedAt: { type: Date },
    recentComments: [{
      _id: { type: mongoose.Schema.Types.ObjectId },
      postId: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      body: { type: String, required: true },
      createdAt: { type: Date, required: true }
    }]
  }, { timestamps: true, collection: 'posts' }));

  try {
    await mongoose.connect(POST_DB_URL);
    
    const posts = [
      {
        title: 'Welcome to Social Feed!',
        body: 'This is the first post on our new social feed platform. Feel free to explore and connect with others!',
        author: 'javier',
        authorId: '670000000000000000000001',
        commentCount: 0,
        deleted: false
      },
      {
        title: 'Getting Started with Angular',
        body: 'Angular is a powerful framework for building web applications. Here are some tips to get started...',
        author: 'javier',
        authorId: '670000000000000000000001',
        commentCount: 0,
        deleted: false
      },
      {
        title: 'NestJS Best Practices',
        body: 'When building backend services with NestJS, following best practices ensures maintainability and scalability...',
        author: 'testuser',
        authorId: '670000000000000000000002',
        commentCount: 0,
        deleted: false
      }
    ];

    for (const postData of posts) {
      const post = new Post(postData);
      await post.save();
      console.log(`  ✅ Created post: ${postData.title}`);
    }

    await mongoose.disconnect();
    console.log('✅ Posts database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding posts:', error.message);
  }
}

async function seedComments() {
  console.log('\n💬 Seeding Comments database...');

  const Comment = mongoose.model('Comment', new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Post' },
    authorId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    body: { type: String, required: true, minlength: 1, maxlength: 1000 },
    createdAt: { type: Date, required: true, default: () => new Date() },
    updatedAt: { type: Date }
  }, { timestamps: true, collection: 'comments' }));

  try {
    await mongoose.connect(COMMENT_DB_URL);
    
    const comments = [
      {
        name: 'testuser',
        email: 'test@example.com',
        body: 'Great introduction! Looking forward to using this platform.',
        authorId: '670000000000000000000002',
        postId: '670000000000000000000001'
      },
      {
        name: 'demo',
        email: 'demo@example.com',
        body: 'Thanks for sharing! Angular is indeed a great framework.',
        authorId: '670000000000000000000003',
        postId: '670000000000000000000002'
      }
    ];

    for (const commentData of comments) {
      const comment = new Comment(commentData);
      await comment.save();
      console.log(`  ✅ Created comment by ${commentData.author}`);
    }

    await mongoose.disconnect();
    console.log('✅ Comments database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding comments:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting database reset and seed process...\n');
  
  // Drop all databases
  await dropDatabase(USER_DB_URL, 'users');
  await dropDatabase(POST_DB_URL, 'posts');
  await dropDatabase(COMMENT_DB_URL, 'comments');
  
  // Wait a moment for databases to be fully dropped
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Seed databases
  await seedUsers();
  await seedPosts();
  await seedComments();
  
  console.log('\n✅ Database reset and seed completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('   Username: javier | Email: javier@example.com | Password: SecurePass123!');
  console.log('   Username: testuser | Email: test@example.com | Password: TestPass123!');
  console.log('   Username: demo | Email: demo@example.com | Password: DemoPass123!');
  console.log('\n⚠️  Note: You need to restart the services to see the changes.');
}

main().catch(console.error);
