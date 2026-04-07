/**
 * Seed practice problems with problemNumber 1-12.
 * Run: node scripts/seedProblems.js (from server directory)
 * Requires: MONGO_URI in .env or environment
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Problem = require("../models/Problem");

const PRACTICE_PROBLEMS = [
  { problemNumber: 1, title: "Two Sum", difficulty: "Easy", description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.", testCases: [{ input: "2 7 11 15\n9", output: "[0,1]" }] },
  { problemNumber: 2, title: "Reverse Linked List", difficulty: "Easy", description: "Reverse a singly linked list.", testCases: [] },
  { problemNumber: 3, title: "Valid Parentheses", difficulty: "Easy", description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.", testCases: [] },
  { problemNumber: 4, title: "Longest Substring", difficulty: "Medium", description: "Find the length of the longest substring without repeating characters.", testCases: [] },
  { problemNumber: 5, title: "Binary Tree Level Order", difficulty: "Medium", description: "Given the root of a binary tree, return the level order traversal of its nodes' values.", testCases: [] },
  { problemNumber: 6, title: "Merge Intervals", difficulty: "Medium", description: "Merge overlapping intervals.", testCases: [] },
  { problemNumber: 7, title: "LRU Cache", difficulty: "Hard", description: "Design and implement a data structure for Least Recently Used (LRU) cache.", testCases: [] },
  { problemNumber: 8, title: "Median of Two Sorted Arrays", difficulty: "Hard", description: "Find the median of two sorted arrays.", testCases: [] },
  { problemNumber: 9, title: "Regular Expression Matching", difficulty: "Hard", description: "Implement regular expression matching.", testCases: [] },
  { problemNumber: 10, title: "Container With Most Water", difficulty: "Medium", description: "Find two lines that form a container with the most water.", testCases: [] },
  { problemNumber: 11, title: "3Sum", difficulty: "Medium", description: "Find all unique triplets that sum to zero.", testCases: [] },
  { problemNumber: 12, title: "Climbing Stairs", difficulty: "Easy", description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?", testCases: [] },
];

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set. Create .env with MONGO_URI.");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
  for (const p of PRACTICE_PROBLEMS) {
    const updated = await Problem.findOneAndUpdate(
      { problemNumber: p.problemNumber },
      { $set: p },
      { upsert: true, returnDocument: "after" }
    );
    console.log(`Upserted problem ${p.problemNumber}: ${p.title}`);
  }
  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
