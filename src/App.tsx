import React, { useState, useEffect } from 'react';
import { TournamentFormat, Team, Match, TournamentRules } from './types';
import { TeamCalculator } from './components/TeamCalculator';
import { BracketView } from './components/BracketView';
import { PoolPlayView } from './components/PoolPlayView';
import { Trophy, Settings, Play, Plus, Trash2, LayoutGrid, GitMerge, Repeat, Users, Share2, LogIn, ShieldCheck, Info, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User,
  signOut 
} from 'firebase/auth';

import { WinnersListView } from './components/WinnersListView';

const DEFAULT_RULES: TournamentRules = {
  pointsToWin: 25,
  bestOf: 3,
  thirdSetTo: 15,
  serveToWin: false,
  winnerStays: true,
  maxConsecutiveWins: 3,
  onMaxWins: 'other-stays'
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [rules, setRules] = useState<TournamentRules>(DEFAULT_RULES);
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'Team 1' },
    { id: '2', name: 'Team 2' },
    { id: '3', name: 'Team 3' },
    { id: '4', name: 'Team 4' },
  ]);
  const [format, setFormat] = useState<TournamentFormat>('single');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'winners-list'>('tournaments');
  const [numNets, setNumNets] = useState(1);
  const [preSignupCount, setPreSignupCount] = useState(8);
  const [queue, setQueue] = useState<string[]>([]);
  const [activeNets, setActiveNets] = useState<{ [key: number]: string | null }>({});

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = () => signOut(auth);

  // Sync Tournament
  useEffect(() => {
    if (!tournamentId) return;

    const unsubTournament = onSnapshot(doc(db, 'tournaments', tournamentId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setFormat(data.format);
        setIsStarted(data.isStarted);
        setIsFinished(data.isFinished || false);
        setRules(data.rules || DEFAULT_RULES);
        setInviteCode(data.inviteCode);
        setIsCreator(data.creatorId === user?.uid);
        setNumNets(data.numNets || 1);
        setQueue(data.queue || []);
        setActiveNets(data.activeNets || {});
      }
    });

    const unsubTeams = onSnapshot(collection(db, 'tournaments', tournamentId, 'teams'), (snapshot) => {
      const teamsData = snapshot.docs.map(d => d.data() as Team);
      setTeams(teamsData.length > 0 ? teamsData : teams);
    });

    const unsubMatches = onSnapshot(collection(db, 'tournaments', tournamentId, 'matches'), (snapshot) => {
      const matchesData = snapshot.docs.map(d => d.data() as Match);
      setMatches(matchesData);
    });

    return () => {
      unsubTournament();
      unsubTeams();
      unsubMatches();
    };
  }, [tournamentId, user]);

  const createTournament = async () => {
    if (!user) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newTournamentRef = doc(collection(db, 'tournaments'));
    const id = newTournamentRef.id;

    await setDoc(newTournamentRef, {
      name: 'New Tournament',
      format,
      isStarted: false,
      isFinished: false,
      inviteCode: code,
      creatorId: user.uid,
      rules,
      numNets,
      queue: [],
      activeNets: {},
      createdAt: serverTimestamp()
    });

    // Save initial teams
    for (const team of teams) {
      await setDoc(doc(db, 'tournaments', id, 'teams', team.id), { ...team, consecutiveWins: 0 });
    }

    setTournamentId(id);
    setInviteCode(code);
    setIsCreator(true);
  };

  const joinTournament = async () => {
    const q = query(collection(db, 'tournaments'), where('inviteCode', '==', joinCode.toUpperCase()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      setTournamentId(snapshot.docs[0].id);
    } else {
      alert('Invalid invite code');
    }
  };

  const addTeam = async () => {
    const nextNum = teams.length > 0 ? Math.max(...teams.map(t => parseInt(t.id) || 0)) + 1 : 1;
    const newId = nextNum.toString();
    const newTeam = { id: newId, name: `Team ${newId}` };
    
    if (tournamentId) {
      await setDoc(doc(db, 'tournaments', tournamentId, 'teams', newId), newTeam);
    } else {
      setTeams([...teams, newTeam]);
    }
  };

  const removeTeam = async (id: string) => {
    if (tournamentId) {
      // For simplicity, we'll just update local state if not started, 
      // but in a real app we'd delete from Firestore
      setTeams(teams.filter(t => t.id !== id));
    } else {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  const updateTeamName = async (id: string, name: string) => {
    if (tournamentId) {
      await updateDoc(doc(db, 'tournaments', tournamentId, 'teams', id), { name });
    } else {
      setTeams(teams.map(t => t.id === id ? { ...t, name } : t));
    }
  };

  const updateRules = async (newRules: Partial<TournamentRules>) => {
    const updated = { ...rules, ...newRules };
    setRules(updated);
    if (tournamentId) {
      await updateDoc(doc(db, 'tournaments', tournamentId), { rules: updated });
    }
  };

  const startTournament = async () => {
    let initialMatches: Match[] = [];

    if (format === 'single') {
      initialMatches = generateSingleElimination(teams);
    } else if (format === 'double') {
      initialMatches = generateDoubleElimination(teams);
    } else if (format === 'pool') {
      initialMatches = generatePoolPlay(teams);
    } else if (format === 'play-twice') {
      initialMatches = generatePlayTwice(teams);
    } else if (format === 'winners-list') {
      let currentTeams = teams;
      if (teams.length === 0 && preSignupCount > 0) {
        currentTeams = Array.from({ length: preSignupCount }).map((_, i) => ({
          id: `team-${i + 1}`,
          name: `Team ${i + 1}`,
          consecutiveWins: 0
        }));
      }

      const initialQueue = currentTeams.map(t => t.id);
      const initialActiveNets: { [key: number]: string | null } = {};
      
      for (let i = 0; i < numNets; i++) {
        if (initialQueue.length >= 2) {
          const t1Id = initialQueue.shift()!;
          const t2Id = initialQueue.shift()!;
          const matchId = `net-${i}-${Date.now()}`;
          const match: Match = {
            id: matchId,
            team1Id: t1Id,
            team2Id: t2Id,
            round: 1,
            netIndex: i
          };
          initialMatches.push(match);
          initialActiveNets[i] = matchId;
        } else {
          initialActiveNets[i] = null;
        }
      }

      if (tournamentId) {
        // Save teams if they were generated
        if (teams.length === 0) {
          for (const team of currentTeams) {
            await setDoc(doc(db, 'tournaments', tournamentId, 'teams', team.id), team);
          }
        } else {
          // Reset consecutive wins for all teams
          for (const team of teams) {
            await updateDoc(doc(db, 'tournaments', tournamentId, 'teams', team.id), { consecutiveWins: 0 });
          }
        }

        await updateDoc(doc(db, 'tournaments', tournamentId), { 
          isStarted: true, 
          isFinished: false,
          queue: initialQueue,
          activeNets: initialActiveNets
        });
        for (const match of initialMatches) {
          await setDoc(doc(db, 'tournaments', tournamentId, 'matches', match.id), match);
        }
      } else {
        setMatches(initialMatches);
        setQueue(initialQueue);
        setActiveNets(initialActiveNets);
        setIsStarted(true);
        setIsFinished(false);
        setTeams(currentTeams.map(t => ({ ...t, consecutiveWins: 0 })));
      }
      return;
    }

    if (tournamentId) {
      await updateDoc(doc(db, 'tournaments', tournamentId), { isStarted: true, isFinished: false });
      for (const match of initialMatches) {
        await setDoc(doc(db, 'tournaments', tournamentId, 'matches', match.id), match);
      }
    } else {
      setMatches(initialMatches);
      setIsStarted(true);
      setIsFinished(false);
    }
  };

  const abortTournament = async () => {
    if (window.confirm("Are you sure you want to abort the tournament and return home? All progress will be lost.")) {
      if (tournamentId) {
        await updateDoc(doc(db, 'tournaments', tournamentId), { isStarted: false, isFinished: false });
        // In a real app we might want to delete matches too
      }
      setIsStarted(false);
      setIsFinished(false);
      setMatches([]);
      setTournamentId(null);
    }
  };

  const endTournament = async () => {
    if (window.confirm("End the tournament? This will finalize the results.")) {
      if (tournamentId) {
        await updateDoc(doc(db, 'tournaments', tournamentId), { isFinished: true });
      } else {
        setIsFinished(true);
      }
    }
  };

  const exportAsImage = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const element = document.getElementById('tournament-view');
    if (!element) return;

    const canvas = await html2canvas(element, {
      backgroundColor: '#f9fafb',
      scale: 2,
      logging: false,
      useCORS: true
    });

    const link = document.createElement('a');
    link.download = `tournament-results-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const generateSingleElimination = (teams: Team[], prefix = 'm', bracketType: 'winners' | 'losers' = 'winners'): Match[] => {
    const numTeams = teams.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const bracketSize = Math.pow(2, numRounds);
    const matches: Match[] = [];

    // Round 1
    for (let i = 0; i < bracketSize / 2; i++) {
      const team1Idx = i;
      const team2Idx = bracketSize - 1 - i;
      
      matches.push({
        id: `${prefix}1-${i}`,
        team1Id: team1Idx < numTeams ? teams[team1Idx].id : null,
        team2Id: team2Idx < numTeams ? teams[team2Idx].id : null,
        round: 1,
        bracketType,
        nextMatchId: numRounds > 1 ? `${prefix}2-${Math.floor(i / 2)}` : null
      });
    }

    // Subsequent rounds
    for (let r = 2; r <= numRounds; r++) {
      const matchesInRound = Math.pow(2, numRounds - r);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: `${prefix}${r}-${i}`,
          team1Id: null,
          team2Id: null,
          round: r,
          bracketType,
          nextMatchId: r < numRounds ? `${prefix}${r + 1}-${Math.floor(i / 2)}` : null
        });
      }
    }

    return matches;
  };

  const generateDoubleElimination = (teams: Team[]): Match[] => {
    const numTeams = teams.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const bracketSize = Math.pow(2, numRounds);
    
    // 1. Winners Bracket (WB)
    const winners = generateSingleElimination(teams, 'w', 'winners');
    
    // 2. Losers Bracket (LB)
    // LB has roughly 2 * (numRounds - 1) rounds
    const losers: Match[] = [];
    
    // Round 1 of LB receives losers from Round 1 of WB
    // Round 2 of LB receives losers from Round 2 of WB
    // and so on.
    
    // For simplicity, we'll create a structure that can hold the losers
    // A proper LB is complex, but we'll create enough matches to accommodate everyone
    for (let r = 1; r <= (numRounds - 1) * 2; r++) {
      // Round 1, 3, 5... are "entry" rounds from WB
      // Round 2, 4, 6... are "consolidation" rounds
      const matchesInRound = Math.pow(2, Math.floor((numRounds - 1 - (r/2))));
      if (matchesInRound < 1) break;
      
      for (let i = 0; i < matchesInRound; i++) {
        losers.push({
          id: `l${r}-${i}`,
          team1Id: null,
          team2Id: null,
          round: r,
          bracketType: 'losers',
          nextMatchId: `l${r + 1}-${Math.floor(i / 2)}`
        });
      }
    }

    // Connect WB losers to LB
    // WB Round 1 losers go to LB Round 1
    winners.filter(m => m.round === 1).forEach((m, i) => {
      m.loserMatchId = `l1-${Math.floor(i / 1)}`; // Simplified mapping
    });
    // WB Round 2 losers go to LB Round 2 or 3...
    // This mapping is tricky without a full bracket engine, but we'll set the IDs
    for (let r = 2; r < numRounds; r++) {
      winners.filter(m => m.round === r).forEach((m, i) => {
        m.loserMatchId = `l${(r-1)*2}-${i}`; 
      });
    }

    // 3. Grand Finals
    const wbFinal = winners.find(m => m.round === numRounds);
    const lbFinal = losers[losers.length - 1];
    
    const grandFinal: Match = {
      id: 'gf-1',
      team1Id: null, // From WB
      team2Id: null, // From LB
      round: numRounds + 1,
      bracketType: 'winners',
      nextMatchId: 'gf-2' // If necessary
    };

    const grandFinalIfNecessary: Match = {
      id: 'gf-2',
      team1Id: null,
      team2Id: null,
      round: numRounds + 2,
      bracketType: 'winners',
      nextMatchId: null
    };

    if (wbFinal) wbFinal.nextMatchId = 'gf-1';
    if (lbFinal) lbFinal.nextMatchId = 'gf-1';

    return [...winners, ...losers, grandFinal, grandFinalIfNecessary];
  };

  const generatePoolPlay = (teams: Team[]): Match[] => {
    const matches: Match[] = [];
    let matchCount = 1;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `p-${matchCount++}`,
          team1Id: teams[i].id,
          team2Id: teams[j].id,
          round: 1
        });
      }
    }
    return matches;
  };

  const generatePlayTwice = (teams: Team[]): Match[] => {
    const matches: Match[] = [];
    const n = teams.length;
    if (n < 2) return [];

    // Pattern: (i, (i + 1) % n) ensures every team plays exactly twice
    // For even n, this naturally splits into 2 rounds
    // For odd n, it splits into 3 rounds
    for (let i = 0; i < n; i++) {
      const team1 = teams[i];
      const team2 = teams[(i + 1) % n];
      
      let round = (i % 2) + 1;
      // If n is odd, the last game (n-1, 0) would conflict with Round 1 (team 0) and Round 2 (team n-1)
      if (n % 2 !== 0 && i === n - 1) {
        round = 3;
      }

      matches.push({
        id: `pt-${i}`,
        team1Id: team1.id,
        team2Id: team2.id,
        round: round
      });
    }
    return matches;
  };

  const onJoinQueue = async (teamId: string) => {
    const newQueue = [...queue, teamId];
    if (tournamentId) {
      await updateDoc(doc(db, 'tournaments', tournamentId), { queue: newQueue });
    } else {
      setQueue(newQueue);
    }
  };

  const onLeaveQueue = async (teamId: string) => {
    const newQueue = queue.filter(id => id !== teamId);
    if (tournamentId) {
      await updateDoc(doc(db, 'tournaments', tournamentId), { queue: newQueue });
    } else {
      setQueue(newQueue);
    }
  };

  const updateScore = async (matchId: string, s1: number, s2: number) => {
    const updatedMatches = [...matches];
    const matchIdx = updatedMatches.findIndex(m => m.id === matchId);
    if (matchIdx === -1) return;

    const currentMatch = { ...updatedMatches[matchIdx], score1: s1, score2: s2 };
    const winnerId = s1 > s2 ? currentMatch.team1Id : s2 > s1 ? currentMatch.team2Id : null;
    const loserId = s1 > s2 ? currentMatch.team2Id : s2 > s1 ? currentMatch.team1Id : null;
    currentMatch.winnerId = winnerId;
    updatedMatches[matchIdx] = currentMatch;

    if (format === 'winners-list' && winnerId && loserId) {
      const netIndex = currentMatch.netIndex!;
      const winnerTeam = teams.find(t => t.id === winnerId);
      const loserTeam = teams.find(t => t.id === loserId);
      
      const newQueue = [...queue, loserId];
      let nextTeam1Id = winnerId;
      let nextTeam2Id = null;

      // Update consecutive wins
      const updatedWinnerWins = (winnerTeam?.consecutiveWins || 0) + 1;
      const maxWins = rules.maxConsecutiveWins || 3;
      const reachedMax = updatedWinnerWins >= maxWins;

      if (!rules.winnerStays || (reachedMax && rules.onMaxWins === 'both-off')) {
        newQueue.push(winnerId);
        if (newQueue.length >= 2) {
          nextTeam1Id = newQueue.shift()!;
          nextTeam2Id = newQueue.shift()!;
        }
      } else if (reachedMax && rules.onMaxWins === 'other-stays') {
        newQueue.push(winnerId);
        // Loser stays, so remove them from the end of the queue where they were just added
        newQueue.pop(); 
        if (newQueue.length > 0) {
          nextTeam1Id = loserId; // Other team stays
          nextTeam2Id = newQueue.shift()!;
        }
      } else {
        if (newQueue.length > 0) {
          nextTeam2Id = newQueue.shift()!;
        }
      }

      if (nextTeam1Id && nextTeam2Id) {
        const nextMatchId = `net-${netIndex}-${Date.now()}`;
        const nextMatch: Match = {
          id: nextMatchId,
          team1Id: nextTeam1Id,
          team2Id: nextTeam2Id,
          round: (currentMatch.round || 1) + 1,
          netIndex
        };
        
        if (tournamentId) {
          await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), currentMatch);
          await setDoc(doc(db, 'tournaments', tournamentId, 'matches', nextMatchId), nextMatch);
          // Reset wins if team is new or both off
          const t1Wins = nextTeam1Id === winnerId && !reachedMax ? updatedWinnerWins : 0;
          await updateDoc(doc(db, 'tournaments', tournamentId, 'teams', nextTeam1Id), { consecutiveWins: t1Wins });
          await updateDoc(doc(db, 'tournaments', tournamentId, 'teams', nextTeam2Id), { consecutiveWins: 0 });
          await updateDoc(doc(db, 'tournaments', tournamentId, 'teams', loserId), { consecutiveWins: 0 });

          await updateDoc(doc(db, 'tournaments', tournamentId), { 
            queue: newQueue,
            [`activeNets.${netIndex}`]: nextMatchId 
          });
        } else {
          setMatches([...updatedMatches, nextMatch]);
          setQueue(newQueue);
          setActiveNets({ ...activeNets, [netIndex]: nextMatchId });
          setTeams(teams.map(t => {
            if (t.id === nextTeam1Id) return { ...t, consecutiveWins: nextTeam1Id === winnerId && !reachedMax ? updatedWinnerWins : 0 };
            if (t.id === nextTeam2Id) return { ...t, consecutiveWins: 0 };
            if (t.id === loserId) return { ...t, consecutiveWins: 0 };
            return t;
          }));
        }
      } else {
        // Net becomes empty
        if (tournamentId) {
          await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), currentMatch);
          await updateDoc(doc(db, 'tournaments', tournamentId, 'teams', winnerId), { consecutiveWins: reachedMax ? 0 : updatedWinnerWins });
          await updateDoc(doc(db, 'tournaments', tournamentId, 'teams', loserId), { consecutiveWins: 0 });
          await updateDoc(doc(db, 'tournaments', tournamentId), { 
            queue: newQueue,
            [`activeNets.${netIndex}`]: null 
          });
        } else {
          setMatches(updatedMatches);
          setQueue(newQueue);
          setActiveNets({ ...activeNets, [netIndex]: null });
          setTeams(teams.map(t => {
            if (t.id === winnerId) return { ...t, consecutiveWins: reachedMax ? 0 : updatedWinnerWins };
            if (t.id === loserId) return { ...t, consecutiveWins: 0 };
            return t;
          }));
        }
      }
      return;
    }

    // Propagate winner
    if (currentMatch.nextMatchId && winnerId) {
      const nextMatchIdx = updatedMatches.findIndex(m => m.id === currentMatch.nextMatchId);
      if (nextMatchIdx !== -1) {
        const nextMatch = { ...updatedMatches[nextMatchIdx] };
        
        if (currentMatch.id.startsWith('w')) {
          // Winners bracket propagation
          const isTeam1Slot = parseInt(matchId.split('-')[1]) % 2 === 0;
          if (isTeam1Slot) nextMatch.team1Id = winnerId;
          else nextMatch.team2Id = winnerId;
        } else if (currentMatch.id.startsWith('l')) {
          // Losers bracket propagation
          // Round 1, 3, 5... are entry rounds (team1 is from previous LB, team2 is from WB)
          // Round 2, 4, 6... are consolidation rounds
          const round = currentMatch.round;
          if (round % 2 === 1) {
            nextMatch.team1Id = winnerId;
          } else {
            nextMatch.team2Id = winnerId;
          }
        } else if (currentMatch.id === 'gf-1') {
          // Grand Final 1
          nextMatch.team1Id = currentMatch.team1Id;
          nextMatch.team2Id = currentMatch.team2Id;
          // If LB winner wins GF1, they play GF2
          if (winnerId === currentMatch.team2Id) {
            // GF2 is already in the bracket, we just need to make sure it's ready
          }
        }

        updatedMatches[nextMatchIdx] = nextMatch;
      }
    }

    // Propagate loser (Double Elimination)
    if (currentMatch.loserMatchId && loserId) {
      const loserMatchIdx = updatedMatches.findIndex(m => m.id === currentMatch.loserMatchId);
      if (loserMatchIdx !== -1) {
        const loserMatch = { ...updatedMatches[loserMatchIdx] };
        // Losers from WB always go to team2 slot in LB entry rounds
        loserMatch.team2Id = loserId;
        updatedMatches[loserMatchIdx] = loserMatch;
      }
    }

    if (tournamentId) {
      await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), currentMatch);
      if (currentMatch.nextMatchId) {
        const nextMatch = updatedMatches.find(m => m.id === currentMatch.nextMatchId);
        if (nextMatch) await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', nextMatch.id), nextMatch);
      }
      if (currentMatch.loserMatchId) {
        const loserMatch = updatedMatches.find(m => m.id === currentMatch.loserMatchId);
        if (loserMatch) await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', loserMatch.id), loserMatch);
      }
    } else {
      setMatches(updatedMatches);
    }
  };

  const resetTournament = async () => {
    if (window.confirm("Are you sure you want to reset the tournament? All scores will be lost.")) {
      if (tournamentId) {
        await updateDoc(doc(db, 'tournaments', tournamentId), { isStarted: false });
        // Optionally delete matches, but for now just setting isStarted to false is enough to show setup UI
      } else {
        setIsStarted(false);
        setMatches([]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-grey-blue p-2 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Brackets</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-2">
                {!tournamentId && !isStarted && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Invite Code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="w-24 sm:w-32 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-grey-blue outline-none uppercase"
                    />
                    <button
                      onClick={joinTournament}
                      className="bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Join
                    </button>
                  </div>
                )}

                {tournamentId && (
                  <div className="flex items-center gap-2 bg-grey-green/10 px-3 py-1.5 rounded-lg border border-grey-green/20">
                    <Share2 className="w-4 h-4 text-grey-blue" />
                    <span className="text-sm font-bold text-grey-blue">{inviteCode}</span>
                  </div>
                )}

                {isStarted && isCreator && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={abortTournament}
                      className="text-sm font-medium text-zinc-500 hover:text-red-600 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Abort</span>
                    </button>
                    <button
                      onClick={resetTournament}
                      className="text-sm font-medium text-zinc-500 hover:text-grey-blue transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={logout}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
                  <ShieldCheck className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-600">Local Mode</span>
                </div>
                <button
                  onClick={login}
                  className="bg-grey-blue text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-grey-blue/90 transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isStarted ? (
          <div className="space-y-8">
            {/* Tab Switcher */}
            <div className="flex justify-center">
              <div className="bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm flex gap-1">
                <button
                  onClick={() => {
                    setActiveTab('tournaments');
                    if (format === 'winners-list') setFormat('single');
                  }}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'tournaments' 
                      ? "bg-grey-blue text-white shadow-md" 
                      : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  <GitMerge className="w-4 h-4" />
                  Tournaments
                </button>
                <button
                  onClick={() => {
                    setActiveTab('winners-list');
                    setFormat('winners-list');
                  }}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'winners-list' 
                      ? "bg-grey-blue text-white shadow-md" 
                      : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Winners List
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Team Management & Rules */}
            <div className="lg:col-span-2 space-y-6">
              {/* Rules Section */}
              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-grey-blue" />
                  Tournament Rules
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-zinc-700">Set Format</label>
                    <div className="flex flex-wrap gap-2">
                      {[25, 21, 15, 0].map((p) => (
                        <button
                          key={p}
                          onClick={() => updateRules({ pointsToWin: p as any })}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                            rules.pointsToWin === p 
                              ? "bg-grey-blue text-white border-grey-blue" 
                              : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          {p === 0 ? 'Traditional' : `To ${p}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-zinc-700">Match Length</label>
                    <div className="flex gap-2">
                      {[1, 3].map((b) => (
                        <button
                          key={b}
                          onClick={() => updateRules({ bestOf: b as any })}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                            rules.bestOf === b 
                              ? "bg-grey-blue text-white border-grey-blue" 
                              : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          {b === 1 ? 'One Set' : 'Best of 3'}
                        </button>
                      ))}
                    </div>
                    {rules.bestOf === 3 && (
                      <p className="text-xs text-zinc-500 italic">Third set played to 15 points.</p>
                    )}
                  </div>

                  <div className="sm:col-span-2 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row gap-6">
                    <button
                      onClick={() => updateRules({ serveToWin: !rules.serveToWin })}
                      className="flex items-center gap-3 group"
                    >
                      <div className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        rules.serveToWin ? "bg-grey-blue" : "bg-zinc-200"
                      )}>
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          rules.serveToWin ? "left-7" : "left-1"
                        )} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-zinc-700">Serve to Win</div>
                        <div className="text-xs text-zinc-500">Must be serving to score the winning point.</div>
                      </div>
                    </button>

                    {format === 'winners-list' && (
                      <>
                        <button
                          onClick={() => updateRules({ winnerStays: !rules.winnerStays })}
                          className="flex items-center gap-3 group"
                        >
                          <div className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            rules.winnerStays ? "bg-grey-blue" : "bg-zinc-200"
                          )}>
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                              rules.winnerStays ? "left-7" : "left-1"
                            )} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-zinc-700">Winner Stays</div>
                            <div className="text-xs text-zinc-500">Winners stay on the net for next game.</div>
                          </div>
                        </button>

                        {rules.winnerStays && (
                          <div className="space-y-4 pt-4 border-t border-zinc-100">
                            <label className="block text-sm font-bold text-zinc-700">Max Consecutive Wins</label>
                            <div className="flex gap-2">
                              {[2, 3, 4, 5].map((w) => (
                                <button
                                  key={w}
                                  onClick={() => updateRules({ maxConsecutiveWins: w })}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                    rules.maxConsecutiveWins === w 
                                      ? "bg-grey-blue text-white border-grey-blue" 
                                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                                  )}
                                >
                                  {w} Wins
                                </button>
                              ))}
                            </div>
                            
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase">After Max Wins:</label>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateRules({ onMaxWins: 'other-stays' })}
                                  className={cn(
                                    "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all",
                                    rules.onMaxWins === 'other-stays' 
                                      ? "bg-grey-blue text-white border-grey-blue" 
                                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                                  )}
                                >
                                  Other Team Stays
                                </button>
                                <button
                                  onClick={() => updateRules({ onMaxWins: 'both-off' })}
                                  className={cn(
                                    "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all",
                                    rules.onMaxWins === 'both-off' 
                                      ? "bg-grey-blue text-white border-grey-blue" 
                                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                                  )}
                                >
                                  Both Teams Off
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {format === 'winners-list' && (
                    <div className="sm:col-span-2 pt-4 border-t border-zinc-100 space-y-6">
                      <div className="space-y-4">
                        <label className="block text-sm font-bold text-zinc-700">Number of Nets</label>
                        <div className="flex items-center gap-6">
                          <input
                            type="range"
                            min="1"
                            max="12"
                            value={numNets}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setNumNets(val);
                              if (tournamentId) updateDoc(doc(db, 'tournaments', tournamentId), { numNets: val });
                            }}
                            className="flex-1 accent-grey-blue h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="w-12 h-12 rounded-xl bg-grey-blue/5 border border-grey-blue/20 flex items-center justify-center text-lg font-bold text-grey-blue">
                            {numNets}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-bold text-zinc-700">Pre-sign up Teams</label>
                        <div className="flex items-center gap-6">
                          <input
                            type="range"
                            min="2"
                            max="48"
                            value={preSignupCount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setPreSignupCount(val);
                            }}
                            className="flex-1 accent-grey-blue h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="w-12 h-12 rounded-xl bg-grey-blue/5 border border-grey-blue/20 flex items-center justify-center text-lg font-bold text-grey-blue">
                            {preSignupCount}
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic">Automatically generates placeholder teams to start the queue.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-grey-blue" />
                    Teams ({teams.length})
                  </h2>
                  <div className="flex gap-2">
                    {activeTab === 'winners-list' && (
                      <button
                        onClick={() => {
                          const newTeams = Array.from({ length: preSignupCount }).map((_, i) => ({
                            id: `team-${Date.now()}-${i}`,
                            name: `Team ${teams.length + i + 1}`,
                            consecutiveWins: 0
                          }));
                          setTeams([...teams, ...newTeams]);
                        }}
                        className="bg-grey-green/10 text-grey-blue px-4 py-2 rounded-lg text-sm font-medium hover:bg-grey-green/20 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Quick Add {preSignupCount}
                      </button>
                    )}
                    <button
                      onClick={addTeam}
                      className="bg-grey-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-grey-blue/90 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Team
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatePresence mode="popLayout">
                    {teams.map((team, index) => (
                      <motion.div
                        key={team.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200 group active:bg-zinc-100 transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-500 shadow-sm">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => updateTeamName(team.id, e.target.value)}
                          placeholder={`Team ${index + 1}`}
                          className="flex-1 bg-transparent border-none focus:ring-0 text-base font-semibold p-0 placeholder:text-zinc-400"
                        />
                        <button
                          onClick={() => removeTeam(team.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                          aria-label="Remove team"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {activeTab === 'tournaments' && (
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-grey-blue" />
                    Tournament Style
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'single', name: 'Single Elimination', icon: GitMerge, desc: 'Win or go home.' },
                      { id: 'double', name: 'Double Elimination', icon: GitMerge, desc: 'Two losses to be out.' },
                      { id: 'pool', name: 'Pool Play', icon: LayoutGrid, desc: 'Round robin style.' },
                      { id: 'play-twice', name: 'Play Twice', icon: Repeat, desc: 'Everyone gets 2 games.' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setFormat(style.id as TournamentFormat)}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all",
                          format === style.id 
                            ? "border-grey-blue bg-grey-green/5 ring-4 ring-grey-green/5" 
                            : "border-zinc-100 hover:border-zinc-200 bg-white"
                        )}
                      >
                        <style.icon className={cn("w-6 h-6 mb-2", format === style.id ? "text-grey-blue" : "text-zinc-400")} />
                        <div className="font-bold text-sm">{style.name}</div>
                        <div className="text-xs text-zinc-500 mt-1">{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Calculator & Start */}
            <div className="space-y-6">
              {!tournamentId && (
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                  <h3 className="font-bold text-zinc-900 mb-2 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-grey-blue" />
                    Cloud Sync (Optional)
                  </h3>
                  <p className="text-zinc-500 text-sm mb-6">
                    Go Live to share with players and update scores across all devices in real-time.
                  </p>
                  {!user ? (
                    <button
                      onClick={login}
                      className="w-full bg-grey-green/10 text-grey-blue py-3 rounded-lg font-bold hover:bg-grey-green/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign in to Go Live
                    </button>
                  ) : (
                    <button
                      onClick={createTournament}
                      className="w-full bg-grey-blue text-white py-3 rounded-lg font-bold hover:bg-grey-blue/90 transition-colors"
                    >
                      Create Cloud Tournament
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'tournaments' && <TeamCalculator />}
              
              {matches.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setIsStarted(true)}
                    className="w-full bg-grey-green text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-grey-green/20 hover:bg-grey-green/90 transition-all flex items-center justify-center gap-3"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    Resume {activeTab === 'tournaments' ? 'Tournament' : 'Open Play'}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Start over? This will clear all current scores and matches.")) {
                        setMatches([]);
                        setQueue([]);
                        setActiveNets({});
                        startTournament();
                      }
                    }}
                    disabled={tournamentId && !isCreator}
                    className="w-full bg-white text-zinc-500 py-3 rounded-xl font-bold text-sm border border-zinc-200 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset & Start New
                  </button>
                </div>
              ) : (
                <button
                  onClick={startTournament}
                  disabled={(activeTab === 'tournaments' && teams.length < 2) || (activeTab === 'winners-list' && preSignupCount < 2) || (tournamentId && !isCreator)}
                  className="w-full bg-grey-blue text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-grey-blue/20 hover:bg-grey-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-current" />
                  {tournamentId && !isCreator ? 'Waiting for Creator...' : activeTab === 'tournaments' ? 'Start Tournament' : 'Start Open Play'}
                </button>
              )}
              
              {!tournamentId && !user && (
                <p className="text-center text-xs text-zinc-400">
                  Running in Local Mode. Data is saved only on this device.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
          <div className="max-w-7xl mx-auto px-4 py-8" id="tournament-view">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 mb-2">Tournament Live</h1>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-white border border-zinc-200 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                    <Info className="w-4 h-4 text-grey-blue" />
                    <span className="text-xs font-bold text-zinc-700">
                      {rules.pointsToWin === 0 ? 'Traditional' : `To ${rules.pointsToWin}`}
                      {rules.bestOf === 3 && ' • Best of 3'}
                      {rules.serveToWin && ' • Serve to Win'}
                    </span>
                  </div>
                  {tournamentId && (
                    <div className="bg-grey-blue text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">{inviteCode}</span>
                    </div>
                  )}
                  {isFinished && (
                    <div className="bg-grey-green text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                      <Trophy className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Tournament Finished</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsStarted(false)}
                  className="bg-white text-zinc-700 border border-zinc-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Setup
                </button>
                <button
                  onClick={exportAsImage}
                  className="bg-white text-zinc-700 border border-zinc-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Export Image
                </button>
                {isCreator && !isFinished && (
                  <button
                    onClick={endTournament}
                    className="bg-grey-blue text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-grey-blue/90 transition-colors flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4" />
                    End Tournament
                  </button>
                )}
                {isFinished && isCreator && (
                  <button
                    onClick={() => {
                      if (window.confirm("Start a new tournament? This will clear current results.")) {
                        setIsStarted(false);
                        setIsFinished(false);
                      }
                    }}
                    className="bg-grey-blue text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-grey-blue/90 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Tournament
                  </button>
                )}
              </div>
            </div>

            {format === 'winners-list' ? (
              <WinnersListView 
                matches={matches} 
                teams={teams} 
                queue={queue}
                numNets={numNets}
                onUpdateScore={updateScore}
                onJoinQueue={onJoinQueue}
                onLeaveQueue={onLeaveQueue}
                isCreator={isCreator}
                isFinished={isFinished}
                rules={rules}
              />
            ) : (format === 'pool' || format === 'play-twice') ? (
              <PoolPlayView matches={matches} teams={teams} onUpdateScore={updateScore} isFinished={isFinished} />
            ) : (
              <BracketView matches={matches} teams={teams} onUpdateScore={updateScore} isFinished={isFinished} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
