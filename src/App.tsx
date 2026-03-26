import React, { useState, useEffect } from 'react';
import { TournamentFormat, Team, Match, TournamentRules } from './types';
import { TeamCalculator } from './components/TeamCalculator';
import { BracketView } from './components/BracketView';
import { PoolPlayView } from './components/PoolPlayView';
import { Trophy, Settings, Play, Plus, Trash2, LayoutGrid, GitMerge, Repeat, Users, Share2, LogIn, ShieldCheck, Info } from 'lucide-react';
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

const DEFAULT_RULES: TournamentRules = {
  pointsToWin: 25,
  bestOf: 3,
  thirdSetTo: 15,
  serveToWin: false
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
  const [isCreator, setIsCreator] = useState(false);

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
        setRules(data.rules || DEFAULT_RULES);
        setInviteCode(data.inviteCode);
        setIsCreator(data.creatorId === user?.uid);
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
      inviteCode: code,
      creatorId: user.uid,
      rules,
      createdAt: serverTimestamp()
    });

    // Save initial teams
    for (const team of teams) {
      await setDoc(doc(db, 'tournaments', id, 'teams', team.id), team);
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
    }

    if (tournamentId) {
      await updateDoc(doc(db, 'tournaments', tournamentId), { isStarted: true });
      for (const match of initialMatches) {
        await setDoc(doc(db, 'tournaments', tournamentId, 'matches', match.id), match);
      }
    } else {
      setMatches(initialMatches);
      setIsStarted(true);
    }
  };

  const generateSingleElimination = (teams: Team[]): Match[] => {
    const numTeams = teams.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const bracketSize = Math.pow(2, numRounds);
    const matches: Match[] = [];

    // Round 1
    for (let i = 0; i < bracketSize / 2; i++) {
      const team1Idx = i;
      const team2Idx = bracketSize - 1 - i;
      
      matches.push({
        id: `m1-${i}`,
        team1Id: team1Idx < numTeams ? teams[team1Idx].id : null,
        team2Id: team2Idx < numTeams ? teams[team2Idx].id : null,
        round: 1,
        nextMatchId: `m2-${Math.floor(i / 2)}`
      });
    }

    // Subsequent rounds
    for (let r = 2; r <= numRounds; r++) {
      const matchesInRound = Math.pow(2, numRounds - r);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: `m${r}-${i}`,
          team1Id: null,
          team2Id: null,
          round: r,
          nextMatchId: r < numRounds ? `m${r + 1}-${Math.floor(i / 2)}` : null
        });
      }
    }

    return matches;
  };

  const generateDoubleElimination = (teams: Team[]): Match[] => {
    const winners = generateSingleElimination(teams);
    const losers: Match[] = [];
    const numTeams = teams.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    
    // Losers bracket is roughly twice as many rounds as winners
    // This is a simplified version for the MVP that handles the basic structure
    // In a full implementation, we'd map every specific loser slot to a loser match
    
    for (let r = 1; r <= (numRounds - 1) * 2; r++) {
      const matchesInRound = Math.pow(2, Math.floor((numRounds - 1 - (r/2))));
      if (matchesInRound < 1) break;
      
      for (let i = 0; i < matchesInRound; i++) {
        losers.push({
          id: `l${r}-${i}`,
          team1Id: null,
          team2Id: null,
          round: r,
          bracketType: 'losers',
          nextMatchId: r < (numRounds - 1) * 2 ? `l${r + 1}-${Math.floor(i / 2)}` : 'final'
        });
      }
    }

    return [...winners, ...losers];
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
    // Everyone plays twice logic
    // Simple implementation: Pair 1-2, 3-4, then 1-3, 2-4 etc.
    const matches: Match[] = [];
    const n = teams.length;
    
    // First set of games
    for (let i = 0; i < n; i += 2) {
      if (i + 1 < n) {
        matches.push({ id: `pt1-${i}`, team1Id: teams[i].id, team2Id: teams[i+1].id, round: 1 });
      }
    }
    
    // Second set of games (shifted)
    for (let i = 0; i < n; i += 2) {
      const t1 = teams[(i + 1) % n];
      const t2 = teams[(i + 2) % n];
      matches.push({ id: `pt2-${i}`, team1Id: t1.id, team2Id: t2.id, round: 2 });
    }
    
    return matches;
  };

  const updateScore = async (matchId: string, s1: number, s2: number) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        const winnerId = s1 > s2 ? m.team1Id : s2 > s1 ? m.team2Id : null;
        return { ...m, score1: s1, score2: s2, winnerId };
      }
      return m;
    });

    // Propagate winner to next match if applicable
    const currentMatch = updatedMatches.find(m => m.id === matchId);
    if (currentMatch?.nextMatchId && currentMatch.winnerId) {
      const nextMatch = updatedMatches.find(m => m.id === currentMatch.nextMatchId);
      if (nextMatch) {
        const isTeam1Slot = parseInt(matchId.split('-')[1]) % 2 === 0;
        if (isTeam1Slot) {
          nextMatch.team1Id = currentMatch.winnerId;
        } else {
          nextMatch.team2Id = currentMatch.winnerId;
        }
      }
    }

    if (tournamentId) {
      const matchToUpdate = updatedMatches.find(m => m.id === matchId);
      if (matchToUpdate) {
        await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), matchToUpdate);
        // Also update next match if it changed
        if (currentMatch?.nextMatchId) {
          const nextMatch = updatedMatches.find(m => m.id === currentMatch.nextMatchId);
          if (nextMatch) {
            await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', currentMatch.nextMatchId), nextMatch);
          }
        }
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
                  <button
                    onClick={resetTournament}
                    className="text-sm font-medium text-zinc-500 hover:text-red-600 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
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

                  <div className="sm:col-span-2 pt-4 border-t border-zinc-100">
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
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-grey-blue" />
                    Teams ({teams.length})
                  </h2>
                  <button
                    onClick={addTeam}
                    className="bg-grey-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-grey-blue/90 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Team
                  </button>
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
                          placeholder={`Team ${team.id}`}
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

              <TeamCalculator />
              
              <button
                onClick={startTournament}
                disabled={teams.length < 2 || (tournamentId && !isCreator)}
                className="w-full bg-grey-blue text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-grey-blue/20 hover:bg-grey-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <Play className="w-6 h-6 fill-current" />
                {tournamentId && !isCreator ? 'Waiting for Creator...' : 'Start Tournament'}
              </button>
              
              {!tournamentId && !user && (
                <p className="text-center text-xs text-zinc-400">
                  Running in Local Mode. Data is saved only on this device.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">
                  {format === 'single' && 'Single Elimination'}
                  {format === 'double' && 'Double Elimination'}
                  {format === 'pool' && 'Pool Play Standings'}
                  {format === 'play-twice' && 'Play Twice Schedule'}
                </h2>
                <p className="text-zinc-500 text-sm mt-1">{teams.length} Teams Participating</p>
              </div>

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
              </div>
            </div>

            {(format === 'single' || format === 'double') && (
              <BracketView matches={matches} teams={teams} onUpdateScore={updateScore} />
            )}

            {(format === 'pool' || format === 'play-twice') && (
              <PoolPlayView matches={matches} teams={teams} onUpdateScore={updateScore} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
