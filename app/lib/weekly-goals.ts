import type { DBShape, DBUserWeeklyGoal, DBHistory, DBUser } from "@/app/lib/server-db";
import { newId } from "@/app/lib/server-db";

type GoalType = "master" | "arena" | "auditor";

type GoalInput = {
  deadline: string;
  targetMaster: number;
  targetArena: number;
  targetAuditor: number;
  rewardCoins?: number;
};

export function findActiveGoal(db: DBShape, userId: string) {
  const now = Date.now();
  return db.userWeeklyGoals
    .filter((goal) => goal.userId === userId && new Date(goal.deadline).getTime() >= now)
    .sort((a, b) => (a.deadline < b.deadline ? 1 : -1))[0];
}

function countHistoryByType(histories: DBHistory[], userId: string, startsAt: string, deadline: string, type: GoalType) {
  const start = new Date(startsAt).getTime();
  const end = new Date(deadline).getTime();
  return histories.filter((item) => {
    const ts = new Date(item.createdAt).getTime();
    return item.userId === userId && item.type === type && ts >= start && ts <= end;
  }).length;
}

function isGoalCompleted(goal: DBUserWeeklyGoal) {
  return (
    goal.progressMaster >= goal.targetMaster
    && goal.progressArena >= goal.targetArena
    && goal.progressAuditor >= goal.targetAuditor
  );
}

export function recalculateGoalProgress(db: DBShape, goal: DBUserWeeklyGoal) {
  goal.progressMaster = countHistoryByType(db.histories, goal.userId, goal.startsAt, goal.deadline, "master");
  goal.progressArena = countHistoryByType(db.histories, goal.userId, goal.startsAt, goal.deadline, "arena");
  goal.progressAuditor = countHistoryByType(db.histories, goal.userId, goal.startsAt, goal.deadline, "auditor");
  goal.updatedAt = new Date().toISOString();
  if (isGoalCompleted(goal) && !goal.completedAt) {
    goal.completedAt = new Date().toISOString();
  }
}

function rewardUserForGoal(user: DBUser | undefined, goal: DBUserWeeklyGoal) {
  if (!user || goal.rewardClaimedAt || !isGoalCompleted(goal)) return 0;
  user.coins += goal.rewardCoins;
  goal.rewardClaimedAt = new Date().toISOString();
  if (!goal.completedAt) goal.completedAt = goal.rewardClaimedAt;
  return goal.rewardCoins;
}

function normalizeInput(input: GoalInput) {
  const deadline = new Date(input.deadline);
  if (Number.isNaN(deadline.getTime())) {
    throw new Error("Deadline không hợp lệ.");
  }

  return {
    startsAt: new Date(deadline.getTime() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    deadline: deadline.toISOString(),
    targetMaster: Math.max(0, Math.floor(input.targetMaster)),
    targetArena: Math.max(0, Math.floor(input.targetArena)),
    targetAuditor: Math.max(0, Math.floor(input.targetAuditor)),
    rewardCoins: Math.max(0, Math.floor(input.rewardCoins ?? 120)),
  };
}

function upsertGoalForUser(db: DBShape, userId: string, input: GoalInput) {
  const normalized = normalizeInput(input);
  let goal = findActiveGoal(db, userId);
  if (!goal) {
    goal = {
      id: newId("goal"),
      userId,
      startsAt: normalized.startsAt,
      deadline: normalized.deadline,
      targetMaster: normalized.targetMaster,
      targetArena: normalized.targetArena,
      targetAuditor: normalized.targetAuditor,
      progressMaster: 0,
      progressArena: 0,
      progressAuditor: 0,
      completedAt: null,
      rewardClaimedAt: null,
      rewardCoins: normalized.rewardCoins,
      updatedAt: new Date().toISOString(),
    };
    db.userWeeklyGoals.push(goal);
  } else {
    goal.startsAt = normalized.startsAt;
    goal.deadline = normalized.deadline;
    goal.targetMaster = normalized.targetMaster;
    goal.targetArena = normalized.targetArena;
    goal.targetAuditor = normalized.targetAuditor;
    goal.rewardCoins = normalized.rewardCoins;
    goal.updatedAt = new Date().toISOString();
  }

  recalculateGoalProgress(db, goal);
  const me = db.users.find((item) => item.id === userId);
  const rewarded = rewardUserForGoal(me, goal);
  return { goal, rewarded };
}

export function upsertWeeklyGoalForUser(db: DBShape, userId: string, input: GoalInput) {
  return upsertGoalForUser(db, userId, input);
}

export function upsertWeeklyGoalForAllUsers(db: DBShape, input: GoalInput) {
  const goalMap: Record<string, DBUserWeeklyGoal> = {};
  let rewardedTotal = 0;

  for (const user of db.users) {
    const { goal, rewarded } = upsertGoalForUser(db, user.id, input);
    goalMap[user.id] = goal;
    rewardedTotal += rewarded;
  }

  return { goalMap, rewardedTotal };
}

export function updateGoalProgressFromHistory(db: DBShape, userId: string, historyType: GoalType) {
  const goal = findActiveGoal(db, userId);
  if (!goal) return { goal: null, rewarded: 0 };

  if (historyType === "master") goal.progressMaster += 1;
  if (historyType === "arena") goal.progressArena += 1;
  if (historyType === "auditor") goal.progressAuditor += 1;
  goal.updatedAt = new Date().toISOString();
  if (isGoalCompleted(goal) && !goal.completedAt) {
    goal.completedAt = new Date().toISOString();
  }

  const me = db.users.find((item) => item.id === userId);
  const rewarded = rewardUserForGoal(me, goal);
  return { goal, rewarded };
}
