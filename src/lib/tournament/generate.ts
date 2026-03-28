import type { Match, Team } from '../../types';

/** Match counts per round: round 1 has ceil(N/2) games; each later round halves until one winner. */
function eliminationRoundMatchCounts(numTeams: number): number[] {
  const perRound: number[] = [];
  let t = numTeams;
  while (t > 1) {
    perRound.push(Math.ceil(t / 2));
    t = Math.ceil(t / 2);
  }
  return perRound;
}

/**
 * Single elimination: sequential pairing in round 1. If N is odd, exactly one match is a single-team bye
 * (team2 null). No power-of-2 padding with multiple empty slots.
 */
export function generateSingleElimination(
  teams: Team[],
  prefix = 'w',
  bracketType: 'winners' | 'losers' = 'winners'
): Match[] {
  const numTeams = teams.length;
  const perRound = eliminationRoundMatchCounts(numTeams);
  const R = perRound.length;
  const matches: Match[] = [];

  for (let r = 1; r <= R; r++) {
    const count = perRound[r - 1]!;
    for (let i = 0; i < count; i++) {
      matches.push({
        id: `${prefix}${r}-${i}`,
        team1Id: null,
        team2Id: null,
        round: r,
        bracketType,
        nextMatchId: r < R ? `${prefix}${r + 1}-${Math.floor(i / 2)}` : null
      });
    }
  }

  const r1 = matches.filter(m => m.round === 1);
  let ti = 0;
  for (let i = 0; i < r1.length; i++) {
    const t1 = ti < numTeams ? teams[ti++]!.id : null;
    const t2 = ti < numTeams ? teams[ti++]!.id : null;
    const m = r1[i]!;
    const idx = matches.findIndex(x => x.id === m.id);
    if (idx !== -1) {
      matches[idx] = { ...m, team1Id: t1, team2Id: t2 };
    }
  }

  return matches;
}

export function generateDoubleElimination(teams: Team[]): Match[] {
  const winners = generateSingleElimination(teams, 'w', 'winners');
  const k = winners.length ? Math.max(...winners.map(m => m.round)) : 0;

  const losers: Match[] = [];
  const numLBRounds = k > 1 ? 2 * k - 2 : 0;

  for (let r = 1; r <= numLBRounds; r++) {
    const matchesInRound = Math.pow(2, k - 1 - Math.floor((r + 1) / 2));
    for (let i = 0; i < matchesInRound; i++) {
      let nextMatchId: string | null = null;
      if (r < numLBRounds) {
        if (r % 2 !== 0) {
          nextMatchId = `l${r + 1}-${i}`;
        } else {
          nextMatchId = `l${r + 1}-${Math.floor(i / 2)}`;
        }
      } else {
        nextMatchId = 'gf-1';
      }

      losers.push({
        id: `l${r}-${i}`,
        team1Id: null,
        team2Id: null,
        round: r,
        bracketType: 'losers',
        nextMatchId
      });
    }
  }

  winners.filter(m => m.round === 1).forEach((m, i) => {
    m.loserMatchId = `l1-${Math.floor(i / 2)}`;
  });

  for (let r = 2; r <= k; r++) {
    winners.filter(m => m.round === r).forEach((m, i) => {
      const lbRound = (r - 1) * 2;
      if (lbRound <= numLBRounds) {
        m.loserMatchId = `l${lbRound}-${i}`;
      }
    });
  }

  const wbFinal = winners.find(m => m.round === k);
  const lbFinal = losers.find(m => m.round === numLBRounds);

  if (wbFinal) wbFinal.nextMatchId = 'gf-1';
  if (lbFinal) lbFinal.nextMatchId = 'gf-1';

  const grandFinal: Match = {
    id: 'gf-1',
    team1Id: null,
    team2Id: null,
    round: k + 1,
    bracketType: 'winners',
    nextMatchId: 'gf-2'
  };

  const grandFinalIfNecessary: Match = {
    id: 'gf-2',
    team1Id: null,
    team2Id: null,
    round: k + 2,
    bracketType: 'winners',
    nextMatchId: null
  };

  return [...winners, ...losers, grandFinal, grandFinalIfNecessary];
}

/** Traditional round robin: every pair plays exactly once (single pool). */
export function generateRoundRobin(teams: Team[]): Match[] {
  const matches: Match[] = [];
  let matchCount = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchCount++;
      matches.push({
        id: `p-1-${matchCount}`,
        team1Id: teams[i]!.id,
        team2Id: teams[j]!.id,
        round: 1
      });
    }
  }
  return matches;
}

/** Assign group letters A, B, … in team list order (snake / FIFA-style table order). */
export function assignPoolGroupsInOrder(teams: Team[], numGroups: number): Team[] {
  const n = Math.max(1, Math.min(12, Math.floor(numGroups) || 1));
  return teams.map((t, i) => ({ ...t, group: String.fromCharCode(65 + (i % n)) }));
}

export function stripTeamGroups(teams: Team[]): Team[] {
  return teams.map(({ group: _g, ...rest }) => rest as Team);
}

function roundRobinInGroup(teamsInGroup: Team[], groupLetter: string): Match[] {
  const matches: Match[] = [];
  let matchCount = 0;
  for (let i = 0; i < teamsInGroup.length; i++) {
    for (let j = i + 1; j < teamsInGroup.length; j++) {
      matchCount++;
      matches.push({
        id: `p-${groupLetter}-${matchCount}`,
        team1Id: teamsInGroup[i]!.id,
        team2Id: teamsInGroup[j]!.id,
        round: 1,
        poolGroup: groupLetter
      });
    }
  }
  return matches;
}

/**
 * Group-stage pool: each `team.group` plays a round robin within that letter.
 * If no team has `group`, treats everyone as one pool (same as `generateRoundRobin`).
 */
export function generateGroupStagePool(teams: Team[]): Match[] {
  if (!teams.some(t => t.group)) {
    return generateRoundRobin(teams);
  }
  const byGroup = new Map<string, Team[]>();
  for (const t of teams) {
    const g = t.group || 'A';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(t);
  }
  const letters = [...byGroup.keys()].sort();
  const out: Match[] = [];
  for (const letter of letters) {
    out.push(...roundRobinInGroup(byGroup.get(letter)!, letter));
  }
  return out;
}

function seededShuffle(arr: string[], seed: number): string[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

/** Stable hash from team ids for reproducible first-round shuffle. */
export function casualScheduleSeed(teams: Team[]): number {
  let h = 2166136261;
  for (const t of [...teams].sort((a, b) => a.id.localeCompare(b.id))) {
    for (let i = 0; i < t.id.length; i++) {
      h ^= t.id.charCodeAt(i)!;
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

export function casualMaxRound(matches: Match[]): number {
  if (!matches.length) return 0;
  return Math.max(...matches.map(m => m.round));
}

export function casualRoundIsComplete(matches: Match[], round: number): boolean {
  const slice = matches.filter(m => m.round === round);
  return slice.length > 0 && slice.every(m => m.winnerId);
}

function casualPointDiffForTeam(teamId: string, completed: Match[]): number {
  let d = 0;
  for (const m of completed) {
    if (m.team1Id === teamId) {
      d += (m.score1 ?? 0) - (m.score2 ?? 0);
    } else if (m.team2Id === teamId) {
      d += (m.score2 ?? 0) - (m.score1 ?? 0);
    }
  }
  return d;
}

/**
 * Wave 1: everyone plays once (random-ish pairs). Odd team count → one bye match for that wave.
 */
export function generateCasualFirstRound(teams: Team[]): Match[] {
  if (teams.length < 2) return [];
  const ids = seededShuffle(
    teams.map(t => t.id),
    casualScheduleSeed(teams)
  );
  const round = 1;
  const nonce = `${Date.now()}`;
  const matches: Match[] = [];
  let seq = 0;
  for (let i = 0; i + 1 < ids.length; i += 2) {
    matches.push({
      id: `c-${round}-${seq}-${nonce}`,
      team1Id: ids[i]!,
      team2Id: ids[i + 1]!,
      round
    });
    seq += 1;
  }
  if (ids.length % 2 === 1) {
    matches.push({
      id: `c-${round}-${seq}-${nonce}`,
      team1Id: ids[ids.length - 1]!,
      team2Id: null,
      round
    });
  }
  return matches;
}

/**
 * Next wave after all prior rounds are done: sort by wins then point diff, pair 1v2, 3v4…
 * (soft “winners vs winners” — ties break by team id, no stakes).
 */
export function buildNextCasualRound(teams: Team[], allMatches: Match[], nextRound: number): Match[] {
  if (teams.length < 2 || nextRound < 2) return [];

  const completed = allMatches.filter(m => m.winnerId);
  const stats = teams.map(t => {
    const played = completed.filter(m => m.team1Id === t.id || m.team2Id === t.id);
    const wins = played.filter(m => m.winnerId === t.id).length;
    const diff = casualPointDiffForTeam(t.id, played);
    return { id: t.id, wins, diff };
  });
  stats.sort((a, b) => b.wins - a.wins || b.diff - a.diff || a.id.localeCompare(b.id));

  const nonce = `${Date.now()}`;
  const out: Match[] = [];
  let seq = 0;
  for (let i = 0; i + 1 < stats.length; i += 2) {
    out.push({
      id: `c-${nextRound}-${seq}-${nonce}`,
      team1Id: stats[i]!.id,
      team2Id: stats[i + 1]!.id,
      round: nextRound
    });
    seq += 1;
  }
  if (stats.length % 2 === 1) {
    out.push({
      id: `c-${nextRound}-${seq}-${nonce}`,
      team1Id: stats[stats.length - 1]!.id,
      team2Id: null,
      round: nextRound
    });
  }
  return out;
}
