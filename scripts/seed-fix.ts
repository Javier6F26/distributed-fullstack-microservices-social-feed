#!/usr/bin/env node

/**
 * Database Seed Script
 *
 * Seeds the database with sample data using bulk endpoints.
 * Assumes services are running - fails immediately if not.
 *
 * Usage:
 *   npm run seed
 */

import axios from 'axios';

const API_GATEWAY_URL = 'http://204.88.0.80:3000';

const USERS = [
  { username: 'johndoe', email: 'john@example.com', password: 'SecurePass123!' },
  { username: 'janedoe', email: 'jane@example.com', password: 'SecurePass123!' },
  { username: 'bobsmith', email: 'bob@example.com', password: 'SecurePass123!' },
  { username: 'alicejones', email: 'alice@example.com', password: 'SecurePass123!' },
  { username: 'charliebrown', email: 'charlie@example.com', password: 'SecurePass123!' },
];

// Generate unique username/email by appending random suffix
function generateUniqueUsers(): Array<{ username: string; email: string; password: string }> {
  const suffix = Math.floor(Math.random() * 10000);
  return USERS.map(u => ({
    username: `${u.username}${suffix}`,
    email: `${u.email.split('@')[0]}${suffix}@${u.email.split('@')[1]}`,
    password: u.password,
  }));
}

function generatePosts(userIds: Record<string, string>, suffix: string): Array<{ authorId: string; author: string; title: string; body: string }> {
  const authors = [
    { id: userIds['johndoe'] || '60d5ecb5c7f6a92c2c9d9c82', name: 'johndoe' },
    { id: userIds['janedoe'] || '60d5ecb5c7f6a92c2c9d9c83', name: 'janedoe' },
    { id: userIds['bobsmith'] || '60d5ecb5c7f6a92c2c9d9c84', name: 'bobsmith' },
    { id: userIds['alicejones'] || '60d5ecb5c7f6a92c2c9d9c85', name: 'alicejones' },
    { id: userIds['charliebrown'] || '60d5ecb5c7f6a92c2c9d9c86', name: 'charliebrown' },
  ];

  const topics = [
    { title: 'Getting Started with', body: 'This guide covers the fundamentals and best practices for getting started.' },
    { title: 'Advanced Techniques in', body: 'Explore advanced patterns and techniques used by experts in the field.' },
    { title: 'Best Practices for', body: 'Learn industry-standard best practices and conventions.' },
    { title: 'Introduction to', body: 'A comprehensive introduction covering all the basics you need to know.' },
    { title: 'Mastering', body: 'Take your skills to the next level with these mastering techniques.' },
    { title: 'Common Mistakes in', body: 'Avoid these common pitfalls that many developers encounter.' },
    { title: 'Performance Optimization in', body: 'Tips and tricks for optimizing performance in production.' },
    { title: 'Testing Strategies for', body: 'Effective testing approaches to ensure code quality.' },
    { title: 'Security Considerations for', body: 'Essential security practices every developer should follow.' },
    { title: 'Scaling Applications with', body: 'Learn how to scale applications effectively.' },
  ];

  const technologies = [
    'NestJS', 'MongoDB', 'Microservices', 'Angular', 'Docker', 'Redis', 'RabbitMQ', 'TypeScript',
    'Node.js', 'Express', 'GraphQL', 'REST APIs', 'PostgreSQL', 'MySQL', 'Kubernetes', 'AWS',
    'Azure', 'GCP', 'CI/CD', 'DevOps', 'Git', 'Agile', 'TDD', 'DDD', 'Event-Driven Architecture',
    'Serverless', 'WebSockets', 'OAuth', 'JWT', 'Authentication', 'Authorization', 'Caching',
    'Load Balancing', 'Message Queues', 'Database Design', 'API Design', 'Frontend Development',
    'Backend Development', 'Full Stack', 'Mobile Development', 'Progressive Web Apps',
  ];

  const posts: Array<{ authorId: string; author: string; title: string; body: string }> = [];

  // Generate 1000+ posts with unique titles using suffix
  for (let i = 0; i < 1000; i++) {
    const author = authors[i % authors.length];
    const topic = topics[i % topics.length];
    const tech = technologies[i % technologies.length];
    const variant = Math.floor(i / (topics.length * technologies.length)) + 1;

    posts.push({
      authorId: author.id,
      author: author.name,
      title: `${topic.title} ${tech} #${variant}-${suffix}`,
      body: `${topic.body} In this post, we explore ${tech} in depth with practical examples and real-world use cases. Part ${variant} of our comprehensive series.`,
    });
  }

  return posts;
}

function generateComments(userIds: Record<string, string>, postIds: Record<string, string>): Array<{ postId: string; authorId: string; name: string; email: string; body: string }> {
  const posts = Object.keys(postIds);
  const users = Object.keys(userIds);
  const comments: Array<{ postId: string; authorId: string; name: string; email: string; body: string }> = [];
  const bodies = ['Great post!', 'Very informative!', 'Thanks for sharing!', 'Well explained!', 'Learned something new!', 'Awesome insights!', 'Looking forward to more!', 'This helped me a lot!', 'Bookmarked for later!', 'Shared with my team!'];

  // If no users, skip comment generation
  if (users.length === 0) {
    console.log('   ⚠️  No users available, skipping comments');
    return comments;
  }

  // If no posts, skip comment generation
  if (posts.length === 0) {
    console.log('   ⚠️  No posts available, skipping comments');
    return comments;
  }

  // Generate 5-15 comments for each post (all posts)
  posts.forEach((title, i) => {
    const postId = postIds[title];
    const commentCount = 5 + (i % 11); // 5 to 15 comments per post
    for (let j = 0; j < commentCount; j++) {
      const author = users[(i + j) % users.length];
      comments.push({
        postId: postId || '60d5ecb5c7f6a92c2c9d9c90',
        authorId: userIds[author] || '60d5ecb5c7f6a92c2c9d9c82',
        name: author.charAt(0).toUpperCase() + author.slice(1),
        email: `${author}@example.com`,
        body: bodies[j % bodies.length],
      });
    }
  });

  return comments;
}

async function seedUsers() {
  console.log('\n📝 Seeding Users...');
  const users = generateUniqueUsers();
  const suffix = users[0].username.split('_').pop() || String(Date.now());
  const response = await axios.post(`${API_GATEWAY_URL}/users/bulk`, { users }, { timeout: 30000 });
  const result = response.data;
  console.log(`   Created: ${result.summary.created}, Skipped: ${result.summary.skipped}, Errors: ${result.summary.errors}`);

  const userIds: Record<string, string> = {};
  result.details.created.forEach((u: any) => { userIds[u.username] = u._id; });
  return { userIds, suffix };
}

async function seedPosts(userIds: Record<string, string>, suffix: string) {
  console.log('\n📝 Seeding Posts...');
  const posts = generatePosts(userIds, suffix);
  const response = await axios.post(`${API_GATEWAY_URL}/posts/bulk`, { posts }, { timeout: 30000 });
  const result = response.data;
  console.log(`   Created: ${result.summary.created}, Skipped: ${result.summary.skipped}, Errors: ${result.summary.errors}`);

  const postIds: Record<string, string> = {};
  result.details.created.forEach((p: any) => { postIds[p.title] = p._id; });
  return postIds;
}

async function seedComments(userIds: Record<string, string>, postIds: Record<string, string>) {
  console.log('\n📝 Seeding Comments...');
  const comments = generateComments(userIds, postIds);
  const response = await axios.post(`${API_GATEWAY_URL}/comments/bulk`, { comments }, { timeout: 30000 });
  const result = response.data;
  console.log(`   Created: ${result.summary.created}, Skipped: ${result.summary.skipped}, Errors: ${result.summary.errors}`);
  return result;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    usersOnly: args.includes('--users-only'),
    postsOnly: args.includes('--posts-only'),
    commentsOnly: args.includes('--comments-only'),
  };
}

async function main() {
  const options = parseArgs();
  console.log('🚀 Seed Script\n');

  let userIds: Record<string, string> = {};
  let postIds: Record<string, string> = {};
  let suffix = String(Math.floor(Math.random() * 10000));

  if (!options.postsOnly && !options.commentsOnly) {
    const result = await seedUsers();
    userIds = result.userIds;
    suffix = result.suffix;
  }

  if (!options.usersOnly && !options.commentsOnly) {
    postIds = await seedPosts(userIds, suffix);
  }

  if (!options.usersOnly && !options.postsOnly) {
    await seedComments(userIds, postIds);
  }

  console.log('\n✅ Seeding complete!\n');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('   Services are not running. Start them first.');
  }
  process.exit(1);
});
