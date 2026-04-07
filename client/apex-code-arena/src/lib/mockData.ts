/** Sample input/output for RUN (diagnostic) only. Used for "Your Output vs Expected" comparison. */
export type ProblemExample = { input: string; output: string; explanation?: string };

export const problems: Array<{
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  solved: boolean;
  acceptance: number;
  description: string;
  examples?: ProblemExample[];
  constraints?: string[];
}> = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays",
    solved: true,
    acceptance: 78,
    description:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    examples: [{ input: "2 7 11 15\n9", output: "[0,1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9" }],
    constraints: ["2 ≤ nums.length ≤ 10⁴", "-10⁹ ≤ nums[i] ≤ 10⁹", "Only one valid answer exists."],
  },
  {
    id: 2,
    title: "Reverse Linked List",
    difficulty: "Easy",
    category: "Linked Lists",
    solved: true,
    acceptance: 85,
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    examples: [],
    constraints: [],
  },
  {
    id: 3,
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stacks",
    solved: false,
    acceptance: 72,
    description:
      'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid. An input string is valid if: open brackets are closed by the same type of brackets, and open brackets are closed in the correct order.',
    examples: [],
    constraints: [],
  },
  {
    id: 4,
    title: "Longest Substring",
    difficulty: "Medium",
    category: "Strings",
    solved: true,
    acceptance: 45,
    description: "Given a string s, find the length of the longest substring without repeating characters.",
    examples: [],
    constraints: [],
  },
  {
    id: 5,
    title: "Binary Tree Level Order",
    difficulty: "Medium",
    category: "Trees",
    solved: false,
    acceptance: 52,
    description: "Given the root of a binary tree, return the level order traversal of its nodes' values.",
    examples: [],
    constraints: [],
  },
  {
    id: 6,
    title: "Merge Intervals",
    difficulty: "Medium",
    category: "Arrays",
    solved: false,
    acceptance: 48,
    description: "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.",
    examples: [],
    constraints: [],
  },
  {
    id: 7,
    title: "LRU Cache",
    difficulty: "Hard",
    category: "Design",
    solved: false,
    acceptance: 32,
    description:
      "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the LRUCache class.",
    examples: [],
    constraints: [],
  },
  {
    id: 8,
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    category: "Arrays",
    solved: false,
    acceptance: 25,
    description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
    examples: [],
    constraints: [],
  },
  {
    id: 9,
    title: "Regular Expression Matching",
    difficulty: "Hard",
    category: "DP",
    solved: false,
    acceptance: 28,
    description:
      "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where '.' matches any single character and '*' matches zero or more of the preceding element.",
    examples: [],
    constraints: [],
  },
  {
    id: 10,
    title: "Container With Most Water",
    difficulty: "Medium",
    category: "Two Pointers",
    solved: true,
    acceptance: 55,
    description:
      "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container that holds the most water.",
    examples: [],
    constraints: [],
  },
  {
    id: 11,
    title: "3Sum",
    difficulty: "Medium",
    category: "Arrays",
    solved: false,
    acceptance: 42,
    description:
      "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. The solution set must not contain duplicate triplets.",
    examples: [],
    constraints: [],
  },
  {
    id: 12,
    title: "Climbing Stairs",
    difficulty: "Easy",
    category: "DP",
    solved: true,
    acceptance: 88,
    description:
      "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    examples: [{ input: "3", output: "3", explanation: "Three ways: 1+1+1, 1+2, 2+1" }],
    constraints: ["1 ≤ n ≤ 45"],
  },
];

export const leaderboardData = [
  { rank: 1, name: "VerstappenMax", solved: 47, fastest: "0.8s", score: 4820, avatar: "MV" },
  { rank: 2, name: "HamiltonCode", solved: 45, fastest: "1.1s", score: 4650, avatar: "LH" },
  { rank: 3, name: "LeclercDev", solved: 44, fastest: "0.9s", score: 4580, avatar: "CL" },
  { rank: 4, name: "NorrisLando", solved: 42, fastest: "1.3s", score: 4320, avatar: "LN" },
  { rank: 5, name: "PiastriOscar", solved: 40, fastest: "1.5s", score: 4100, avatar: "OP" },
  { rank: 6, name: "SainzSmooth", solved: 38, fastest: "1.2s", score: 3980, avatar: "CS" },
  { rank: 7, name: "RussellGeorge", solved: 37, fastest: "1.4s", score: 3850, avatar: "GR" },
  { rank: 8, name: "AlonsoFernando", solved: 35, fastest: "1.6s", score: 3720, avatar: "FA" },
  { rank: 9, name: "GaslyPierre", solved: 33, fastest: "1.8s", score: 3500, avatar: "PG" },
  { rank: 10, name: "TsunodaYuki", solved: 30, fastest: "2.0s", score: 3200, avatar: "YT" },
];

export interface ContestProblem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  example: { input: string; output: string; explanation: string };
  solved: boolean;
}

export interface Contest {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  status: "upcoming" | "active" | "ended";
  participants: number;
  problems: ContestProblem[];
}

export const contests: Contest[] = [
  {
    id: 1,
    title: "Grand Prix Sprint #42",
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    status: "upcoming",
    participants: 234,
    problems: [
      { id: 101, title: "Pit Stop Sequence", difficulty: "Easy", description: "Given an array of pit stop durations, find the shortest total time for k pit stops.", example: { input: "durations = [3,1,4,1,5], k = 2", output: "2", explanation: "Choose durations 1 and 1" }, solved: false },
      { id: 102, title: "Overtake Planner", difficulty: "Medium", description: "Find the minimum number of moves to overtake all cars ahead.", example: { input: "speeds = [3,5,2,8]", output: "2", explanation: "Overtake 2 slower cars" }, solved: false },
      { id: 103, title: "Tire Strategy", difficulty: "Medium", description: "Optimize tire change strategy across race laps.", example: { input: "laps = 50, degradation = [1,2,3]", output: "85", explanation: "Optimal stint length is 17 laps" }, solved: false },
      { id: 104, title: "DRS Detection", difficulty: "Hard", description: "Detect all valid DRS zones in a circuit represented as a graph.", example: { input: "circuit = [[0,1],[1,2],[2,0]]", output: "1", explanation: "One valid DRS zone found" }, solved: false },
      { id: 105, title: "Grid Position", difficulty: "Easy", description: "Calculate final grid positions from qualifying times.", example: { input: "times = [90.5, 89.2, 91.0, 88.8]", output: "[3,1,0,2]", explanation: "Sort by time ascending" }, solved: false },
    ],
  },
  {
    id: 2,
    title: "Monaco Challenge",
    startTime: new Date(Date.now() - 30 * 60 * 1000),
    endTime: new Date(Date.now() + 90 * 60 * 1000),
    status: "active",
    participants: 512,
    problems: [
      { id: 201, title: "Hairpin Turn", difficulty: "Easy", description: "Find the sharpest turn angle in a sequence of coordinates.", example: { input: "coords = [[0,0],[1,1],[2,0]]", output: "90", explanation: "The angle at [1,1] is 90°" }, solved: false },
      { id: 202, title: "Tunnel Vision", difficulty: "Medium", description: "Navigate through a tunnel represented as a 2D array, finding the path with maximum visibility.", example: { input: "tunnel = [[1,0,1],[1,1,1],[0,1,0]]", output: "4", explanation: "Best path has 4 visible cells" }, solved: false },
      { id: 203, title: "Safety Car Deploy", difficulty: "Medium", description: "Given crash positions and speeds, determine optimal safety car deployment points.", example: { input: "crashes = [3,7,12], track = 20", output: "[3,7]", explanation: "Deploy at positions 3 and 7" }, solved: false },
      { id: 204, title: "Monaco Maze", difficulty: "Hard", description: "Find the fastest route through the Monaco street circuit with obstacles.", example: { input: "grid = 5x5 with barriers", output: "12", explanation: "Shortest path length is 12" }, solved: false },
    ],
  },
  {
    id: 3,
    title: "Silverstone Classic",
    startTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: "ended",
    participants: 389,
    problems: [
      { id: 301, title: "Maggots & Becketts", difficulty: "Easy", description: "Navigate the famous S-curves with minimum distance.", example: { input: "curves = [1,2,3,2,1]", output: "9", explanation: "Sum of all curve values" }, solved: false },
      { id: 302, title: "Copse Corner", difficulty: "Medium", description: "Calculate maximum speed through a banked corner.", example: { input: "radius = 100, bank = 10", output: "145", explanation: "Max speed in km/h" }, solved: false },
      { id: 303, title: "Hangar Straight", difficulty: "Easy", description: "Calculate top speed given engine power and drag coefficient.", example: { input: "power = 800, drag = 0.3", output: "340", explanation: "Top speed in km/h" }, solved: false },
      { id: 304, title: "Stowe Analysis", difficulty: "Hard", description: "Analyze telemetry data to find optimal braking point.", example: { input: "telemetry = [[100,340],[150,320],[200,280]]", output: "150", explanation: "Optimal brake at 150m" }, solved: false },
      { id: 305, title: "Wing Setup", difficulty: "Medium", description: "Find optimal downforce vs drag balance.", example: { input: "options = [[10,5],[20,12],[15,8]]", output: "[15,8]", explanation: "Best balance option" }, solved: false },
      { id: 306, title: "Weather Prediction", difficulty: "Hard", description: "Predict rain probability from weather sensor data stream.", example: { input: "sensors = [0.2,0.5,0.8,0.9]", output: "0.85", explanation: "Rolling probability estimation" }, solved: false },
    ],
  },
];

export const submissionHistory = [
  { id: 1, problem: "Two Sum", time: "0.8s", status: "Accepted", lang: "C++", date: "2 min ago" },
  { id: 2, problem: "Longest Substring", time: "1.2s", status: "Accepted", lang: "Python", date: "15 min ago" },
  { id: 3, problem: "LRU Cache", time: "—", status: "Wrong Answer", lang: "Java", date: "1 hr ago" },
  { id: 4, problem: "Container With Most Water", time: "0.5s", status: "Accepted", lang: "C++", date: "2 hrs ago" },
  { id: 5, problem: "Merge Intervals", time: "—", status: "Runtime Error", lang: "Python", date: "3 hrs ago" },
];

export const activityData = Array.from({ length: 52 * 7 }, (_, i) => ({
  day: i,
  count: Math.random() > 0.4 ? Math.floor(Math.random() * 5) : 0,
}));
