import React, { useState, useMemo } from 'react';
import { Users, AlertCircle } from 'lucide-react';

interface TeamCalculation {
  teamCount: number;
  distribution: { size: number; count: number }[];
  totalPlayers: number;
}

export const TeamCalculator: React.FC = () => {
  const [playerCount, setPlayerCount] = useState<number>(24);

  const calculation = useMemo((): TeamCalculation | null => {
    if (playerCount < 5) return null;

    // We want to find a teamCount 'n' such that playerCount / n is mostly 5 or 6.
    // If it results in 4, we favor 7.
    
    let bestResult: TeamCalculation | null = null;

    // Try different team counts
    for (let n = Math.floor(playerCount / 7); n <= Math.ceil(playerCount / 5); n++) {
      if (n <= 0) continue;

      const baseSize = Math.floor(playerCount / n);
      const remainder = playerCount % n;

      // distribution: 'remainder' teams have baseSize + 1, 'n - remainder' teams have baseSize
      const sizes = [
        { size: baseSize + 1, count: remainder },
        { size: baseSize, count: n - remainder }
      ].filter(d => d.count > 0);

      // Check if any team has 4 players. If so, this distribution is discouraged.
      const hasFour = sizes.some(d => d.size === 4);
      
      // We prefer sizes 5 and 6. 7 is okay if it avoids 4.
      const isValid = sizes.every(d => d.size >= 5 && d.size <= 7);

      if (isValid) {
        // Prefer distributions with more 5s and 6s
        if (!bestResult || (!hasFour && bestResult.distribution.some(d => d.size === 4))) {
          bestResult = { teamCount: n, distribution: sizes, totalPlayers: playerCount };
        }
      }
    }

    return bestResult;
  }, [playerCount]);

  return (
    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-grey-blue" />
        <h2 className="text-lg font-semibold">Team Size Calculator</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Total Players
          </label>
          <input
            type="number"
            value={playerCount}
            onChange={(e) => setPlayerCount(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-grey-blue focus:border-grey-blue outline-none"
          />
        </div>

        {calculation ? (
          <div className="p-4 bg-grey-green/10 rounded-lg border border-grey-green/20">
            <div className="text-sm text-grey-blue font-bold mb-2">
              Recommended: {calculation.teamCount} Teams
            </div>
            <div className="space-y-1">
              {calculation.distribution.map((d, i) => (
                <div key={i} className="text-sm text-grey-blue/80 flex justify-between">
                  <span>{d.count} teams of</span>
                  <span className="font-bold">{d.size} players</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          playerCount > 0 && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                Not enough players to form standard 5-7 person teams.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
