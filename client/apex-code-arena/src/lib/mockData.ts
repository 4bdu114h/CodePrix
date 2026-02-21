export const problems = [
  { id: 1, title: "Two Sum", difficulty: "Easy" as const, category: "Arrays", solved: true, acceptance: 78 },
  { id: 2, title: "Reverse Linked List", difficulty: "Easy" as const, category: "Linked Lists", solved: true, acceptance: 85 },
  { id: 3, title: "Valid Parentheses", difficulty: "Easy" as const, category: "Stacks", solved: false, acceptance: 72 },
  { id: 4, title: "Longest Substring", difficulty: "Medium" as const, category: "Strings", solved: true, acceptance: 45 },
  { id: 5, title: "Binary Tree Level Order", difficulty: "Medium" as const, category: "Trees", solved: false, acceptance: 52 },
  { id: 6, title: "Merge Intervals", difficulty: "Medium" as const, category: "Arrays", solved: false, acceptance: 48 },
  { id: 7, title: "LRU Cache", difficulty: "Hard" as const, category: "Design", solved: false, acceptance: 32 },
  { id: 8, title: "Median of Two Sorted Arrays", difficulty: "Hard" as const, category: "Arrays", solved: false, acceptance: 25 },
  { id: 9, title: "Regular Expression Matching", difficulty: "Hard" as const, category: "DP", solved: false, acceptance: 28 },
  { id: 10, title: "Container With Most Water", difficulty: "Medium" as const, category: "Two Pointers", solved: true, acceptance: 55 },
  { id: 11, title: "3Sum", difficulty: "Medium" as const, category: "Arrays", solved: false, acceptance: 42 },
  { id: 12, title: "Climbing Stairs", difficulty: "Easy" as const, category: "DP", solved: true, acceptance: 88 },
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
