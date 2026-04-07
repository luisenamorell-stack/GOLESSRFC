
export interface Player {
  id: string;
  name: string;
  photoUrl?: string;
  position?: 'GK' | 'DEF' | 'MID' | 'FWD';
  number?: string;
}

export interface Team {
  name: string;
  players: Player[];
  logoUrl?: string;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'assistance' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' | 'corner_kick' | 'injury';
  teamName: string;
  playerName?: string;
  playerPhotoUrl?: string;
  assistantName?: string;
  assistantPhotoUrl?: string;
  timestamp: string; // MM:SS format
  description?: string;
}

export interface MatchState {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  durationMinutes: number;
  events: MatchEvent[];
  status: 'setup' | 'live' | 'finished';
  startTime?: number;
}
