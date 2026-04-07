export type Player = {
  id: string;
  name: string;
};

export type SetScore = {
  player1: number;
  player2: number;
};

export type Match = {
  id: string;
  player1Id: string;
  player2Id: string;
  table: number;
  sets: SetScore[];
  currentSet: SetScore;
  winnerId?: string;
  isCompleted: boolean;
  round: number;
};

export type TournamentFormat = 'SUPER_FIXO' | 'SUPER_INDIVIDUAL';

export type MatchFormat = 
  | '6_GAMES_TIEBREAK' 
  | '6_GAMES_MAX' 
  | '5_GAMES_MAX' 
  | 'SUM_9_GAMES' 
  | 'SUM_7_GAMES';

export type TeamRegistrationType = 'RANDOM_DRAW' | 'DEFINED_TEAMS';

export type TournamentState = {
  players: Player[];
  matches: Match[];
  currentRound: number;
  totalRounds: number;
  tables: number[]; // Now an array of selected court numbers
  format: TournamentFormat;
  matchFormat: MatchFormat;
  registrationType: TeamRegistrationType;
  isFinished: boolean;
};

export type AppStep = 
  | 'HOME' 
  | 'PLAYER_COUNT' 
  | 'FORMAT_SELECTION' 
  | 'MATCH_FORMAT'
  | 'REGISTRATION_TYPE'
  | 'ATHLETE_REGISTRATION' 
  | 'TABLE_COUNT' 
  | 'TOURNAMENT' 
  | 'FINISHED';
