'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  Trophy, 
  Plus, 
  Minus, 
  Users, 
  LayoutGrid, 
  ChevronRight, 
  ChevronLeft, 
  Waves,
  CheckCircle2,
  AlertCircle,
  Medal,
  RefreshCw,
  Home,
  User,
  Settings,
  Circle,
  Sun
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppStep, Player, TournamentState, Match, TournamentFormat, SetScore, MatchFormat, TeamRegistrationType } from '@/types';
import { generateRoundRobin, validateSetScore, getMatchWinner, calculateRankings } from '@/lib/tournament-logic';
import { cn } from '@/lib/utils';

const Header = ({ step, resetApp }: { step: AppStep, resetApp: () => void }) => (
  <div className="flex items-center justify-between mb-8 w-full max-w-6xl">
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex items-center gap-3"
    >
      <div className="bg-accent p-2.5 rounded-xl text-primary shadow-sm">
        <Waves size={24} />
      </div>
      <div>
        <h1 className="text-xl font-display font-bold text-primary leading-none">BeachPró</h1>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de Torneios</span>
      </div>
    </motion.div>
    
    {step !== 'HOME' && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button 
          onClick={resetApp} 
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-all shadow-sm text-sm font-bold"
        >
          <Home size={16} />
          <span>Início</span>
        </button>
      </motion.div>
    )}
  </div>
);

const StepContainer = ({ children, title, subtitle, currentStep }: { children: React.ReactNode, title: string, subtitle?: string, currentStep?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="max-w-2xl mx-auto w-full"
  >
    <div className="text-center mb-8">
      {currentStep !== undefined && (
        <div className="flex justify-center gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                s === currentStep ? "w-8 bg-primary" : "w-2 bg-slate-200"
              )} 
            />
          ))}
        </div>
      )}
      <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-2">{title}</h2>
      {subtitle && <p className="text-slate-500 font-medium">{subtitle}</p>}
    </div>
    <div className="glass-card p-8 md:p-10">
      {children}
    </div>
  </motion.div>
);

export default function PingProApp() {
  const [step, setStep] = useState<AppStep>('HOME');
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedCourts, setSelectedCourts] = useState<number[]>([]);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('6_GAMES_TIEBREAK');
  const [registrationType, setRegistrationType] = useState<TeamRegistrationType>('RANDOM_DRAW');
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormat>('SUPER_FIXO');
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Actions ---

  const startNewTournament = () => setStep('PLAYER_COUNT');

  const handlePlayerCountConfirm = () => {
    if (playerCount < 2) return;
    setStep('FORMAT_SELECTION');
  };

  const handleFormatConfirm = (format: TournamentFormat) => {
    setTournamentFormat(format);
    setStep('MATCH_FORMAT');
  };

  const handleMatchFormatConfirm = (format: MatchFormat) => {
    setMatchFormat(format);
    setStep('REGISTRATION_TYPE');
  };

  const handleRegistrationTypeConfirm = (type: TeamRegistrationType) => {
    setRegistrationType(type);
    
    // Initialize players/teams based on count and type
    let count = 0;
    if (type === 'RANDOM_DRAW') {
      count = playerCount; // Individual athletes
    } else {
      count = playerCount / 2; // Fixed teams
    }

    const initialPlayers = Array.from({ length: count }, (_, i) => ({
      id: `p-${Date.now()}-${i}`,
      name: ''
    }));
    setPlayers(initialPlayers);
    setStep('ATHLETE_REGISTRATION');
  };

  const handleAthletesConfirm = () => {
    if (players.some(p => !p.name.trim())) {
      setError("Todos os nomes são obrigatórios.");
      return;
    }
    setError(null);
    setStep('TABLE_COUNT');
  };

  const handleStartTournament = () => {
    if (selectedCourts.length === 0) {
      setError("Selecione pelo menos uma quadra.");
      return;
    }

    let finalTeams = [...players];
    if (registrationType === 'RANDOM_DRAW') {
      // Shuffle athletes and form teams
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      finalTeams = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        const p1 = shuffled[i];
        const p2 = shuffled[i+1];
        finalTeams.push({
          id: `team-${p1.id}-${p2.id}`,
          name: `${p1.name} / ${p2.name}`
        });
      }
    }

    const matches = generateRoundRobin(finalTeams, selectedCourts);
    const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
    
    setTournament({
      players: finalTeams,
      matches,
      currentRound: 1,
      totalRounds,
      tables: selectedCourts,
      format: tournamentFormat,
      matchFormat,
      registrationType,
      isFinished: false
    });
    setStep('TOURNAMENT');
  };

  const updateMatchScore = (matchId: string, player: 1 | 2, value: number) => {
    if (!tournament) return;

    const newMatches = tournament.matches.map(m => {
      if (m.id !== matchId) return m;
      if (m.isCompleted) return m;
      
      const currentSet = { ...m.currentSet };
      const newValue = player === 1 ? currentSet.player1 + value : currentSet.player2 + value;
      
      // Validation based on match format
      const otherValue = player === 1 ? currentSet.player2 : currentSet.player1;
      const sum = newValue + otherValue;
      
      if (newValue < 0) return m;

      // Limit scores based on format
      if (tournament.matchFormat === '6_GAMES_TIEBREAK') {
        if (newValue > 7) return m;
        if (newValue === 7 && otherValue < 5) return m;
      } else if (tournament.matchFormat === '6_GAMES_MAX') {
        if (newValue > 6) return m;
      } else if (tournament.matchFormat === '5_GAMES_MAX') {
        if (newValue > 5) return m;
      } else if (tournament.matchFormat === 'SUM_9_GAMES') {
        if (sum > 9) return m;
      } else if (tournament.matchFormat === 'SUM_7_GAMES') {
        if (sum > 7) return m;
      }

      if (player === 1) currentSet.player1 = newValue;
      else currentSet.player2 = newValue;
      
      return { ...m, currentSet };
    });

    setTournament({ ...tournament, matches: newMatches });
  };

  const confirmSet = (matchId: string) => {
    if (!tournament) return;
    const match = tournament.matches.find(m => m.id === matchId)!;
    const set = match.currentSet;
    
    const validation = validateSetScore(set.player1, set.player2, tournament.matchFormat);
    if (!validation.isValid) {
      setError(validation.error || "Placar inválido");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Update match with the confirmed set
    const newMatches = tournament.matches.map(m => {
        if (m.id !== matchId) return m;
        
        const updatedSets = [set]; // Only 1 set in Beach Tennis pro-set
        const winnerId = getMatchWinner({ ...m, sets: updatedSets }, tournament.matchFormat);
        
        return { 
          ...m, 
          sets: updatedSets, 
          isCompleted: true, 
          winnerId,
          currentSet: set
        };
    });

    setTournament({ ...tournament, matches: newMatches });
    setError(null);
  };

  const nextRound = () => {
    if (!tournament) return;
    if (tournament.currentRound < tournament.totalRounds) {
      setTournament({ ...tournament, currentRound: tournament.currentRound + 1 });
    } else {
      setTournament({ ...tournament, isFinished: true });
      setStep('FINISHED');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0f172a', '#bef264', '#000000']
      });
    }
  };

  const resetApp = () => {
    setStep('HOME');
    setTournament(null);
    setPlayers([]);
    setPlayerCount(2);
    setSelectedCourts([]);
    setError(null);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <Header step={step} resetApp={resetApp} />

      <div className="w-full max-w-6xl">
        <AnimatePresence mode="wait">
          {step === 'HOME' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full max-w-5xl mx-auto overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-200 bg-white"
            >
              <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-10 md:p-20">
                {/* Content */}
                <div className="max-w-2xl w-full">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-5xl md:text-7xl font-display font-black text-primary mb-6 tracking-tight leading-[0.9]">
                      Torneio de <br /> 
                      <span className="text-accent italic">Beach Tennis</span>
                    </h2>
                    
                    <p className="text-lg text-slate-500 mb-10 mx-auto max-w-md font-medium leading-relaxed">
                      Gerencie seus campeonatos com precisão profissional. Do sorteio das quadras ao pódio final, tudo em um só lugar.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={startNewTournament} 
                        className="btn-primary flex items-center justify-center gap-3 px-10 py-5 text-lg bg-primary text-accent hover:bg-primary/95"
                      >
                        <Plus size={24} />
                        NOVO TORNEIO
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'PLAYER_COUNT' && (
            <StepContainer 
              key="player-count"
              title="Atletas"
              subtitle="Quantos atletas participarão do torneio?"
              currentStep={1}
            >
              <div className="flex flex-col items-center gap-6 md:gap-10">
                <div className="flex items-center gap-4 md:gap-8">
                  <button 
                    onClick={() => setPlayerCount(Math.max(2, playerCount - 2))}
                    className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all text-slate-600"
                  >
                    <Minus size={24} className="md:w-8 md:h-8" />
                  </button>
                  <div className="text-center min-w-[80px] md:min-w-[120px]">
                    <span className="score-display block text-5xl md:text-8xl">
                      {playerCount}
                    </span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Atletas</span>
                  </div>
                  <button 
                    onClick={() => setPlayerCount(Math.min(100, playerCount + 2))}
                    className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all text-slate-600"
                  >
                    <Plus size={24} className="md:w-8 md:h-8" />
                  </button>
                </div>
                <button 
                  onClick={handlePlayerCountConfirm} 
                  disabled={playerCount < 2}
                  className="btn-primary w-full py-4 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {playerCount < 2 ? 'MÍNIMO 2 ATLETAS' : 'AVANÇAR'}
                </button>
              </div>
            </StepContainer>
          )}

          {step === 'FORMAT_SELECTION' && (
            <StepContainer 
              key="format"
              title="Formato SUPER"
              subtitle="Escolha o tipo de disputa em duplas."
              currentStep={2}
            >
              <div className="space-y-4">
                <div 
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all cursor-pointer relative group",
                    [8, 12, 16].includes(playerCount) ? "border-primary bg-primary/5" : "border-slate-100 opacity-50 grayscale"
                  )} 
                  onClick={() => [8, 12, 16].includes(playerCount) && handleFormatConfirm('SUPER_FIXO')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        [8, 12, 16].includes(playerCount) ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <Users size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-primary">SUPER FIXO</h3>
                    </div>
                    {[8, 12, 16].includes(playerCount) && <CheckCircle2 className="text-primary" size={20} />}
                  </div>
                  <p className="text-slate-500 text-sm">Para duplas fixas. Todos contra todos entre as duplas. (Disponível para 8, 12 ou 16 atletas)</p>
                </div>

                <div 
                  className="p-6 rounded-2xl border-2 border-slate-100 transition-all cursor-pointer relative"
                  onClick={() => handleFormatConfirm('SUPER_INDIVIDUAL')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-400">
                        <User size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-primary">SUPER INDIVIDUAL</h3>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold uppercase">Em Breve</span>
                  </div>
                  <p className="text-slate-500 text-sm">Atletas formam duplas diferentes a cada rodada. (Orientações em breve)</p>
                </div>

                <div className="pt-4">
                  {[8, 12, 16].includes(playerCount) ? (
                    <button onClick={() => handleFormatConfirm('SUPER_FIXO')} className="btn-primary w-full py-4">
                      SELECIONAR SUPER FIXO
                    </button>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm flex gap-3">
                      <AlertCircle size={20} className="shrink-0" />
                      <p>O modo SUPER FIXO requer exatamente 8, 12 ou 16 atletas (4, 6 ou 8 duplas).</p>
                    </div>
                  )}
                  <button onClick={() => setStep('PLAYER_COUNT')} className="btn-outline w-full mt-3 py-3">
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'MATCH_FORMAT' && (
            <StepContainer 
              key="match-format"
              title="Formato do Jogo"
              subtitle="Escolha a quantidade de games que quer disputar."
              currentStep={3}
            >
              <div className="space-y-3">
                {[
                  { id: '6_GAMES_TIEBREAK', title: '6 games com tie-break', desc: 'Máximo 7x6.' },
                  { id: '6_GAMES_MAX', title: '6 games máximos', desc: 'Máximo 6x5.' },
                  { id: '5_GAMES_MAX', title: '5 games máximos', desc: 'Máximo 5x4.' },
                  { id: 'SUM_9_GAMES', title: 'Soma de 9 games', desc: 'Soma dos placares chega a 9.' },
                  { id: 'SUM_7_GAMES', title: 'Soma de 7 games', desc: 'Soma dos placares chega a 7.' },
                ].map((f) => (
                  <div 
                    key={f.id}
                    onClick={() => handleMatchFormatConfirm(f.id as MatchFormat)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                      matchFormat === f.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div>
                      <h3 className="font-bold text-primary">{f.title}</h3>
                      <p className="text-slate-500 text-xs">{f.desc}</p>
                    </div>
                    {matchFormat === f.id && <CheckCircle2 className="text-primary" size={20} />}
                  </div>
                ))}

                <div className="pt-4">
                  <button onClick={() => setStep('FORMAT_SELECTION')} className="btn-outline w-full py-3">
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'REGISTRATION_TYPE' && (
            <StepContainer 
              key="reg-type"
              title="Formação de Duplas"
              subtitle="Como as duplas serão organizadas?"
              currentStep={4}
            >
              <div className="space-y-4">
                <div 
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                    registrationType === 'RANDOM_DRAW' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                  )}
                  onClick={() => handleRegistrationTypeConfirm('RANDOM_DRAW')}
                >
                  <div>
                    <h3 className="font-bold text-primary">Sorteio de Duplas</h3>
                    <p className="text-slate-500 text-sm">O sistema sorteará aleatoriamente as duplas entre os atletas.</p>
                  </div>
                  {registrationType === 'RANDOM_DRAW' && <CheckCircle2 className="text-primary" size={20} />}
                </div>

                <div 
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                    registrationType === 'DEFINED_TEAMS' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                  )}
                  onClick={() => handleRegistrationTypeConfirm('DEFINED_TEAMS')}
                >
                  <div>
                    <h3 className="font-bold text-primary">Duplas Definidas</h3>
                    <p className="text-slate-500 text-sm">Você preencherá o nome de cada dupla já formada.</p>
                  </div>
                  {registrationType === 'DEFINED_TEAMS' && <CheckCircle2 className="text-primary" size={20} />}
                </div>

                <div className="pt-4">
                  <button onClick={() => setStep('MATCH_FORMAT')} className="btn-outline w-full py-3">
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'ATHLETE_REGISTRATION' && (
            <StepContainer 
              key="athletes"
              title={registrationType === 'RANDOM_DRAW' ? "Cadastro de Atletas" : "Cadastro de Duplas"}
              subtitle={registrationType === 'RANDOM_DRAW' ? "Insira o nome de cada atleta para o sorteio." : "Insira o nome de cada dupla."}
              currentStep={5}
            >
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 mb-6 custom-scrollbar">
                {players.map((player, idx) => (
                  <div key={player.id} className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {registrationType === 'RANDOM_DRAW' ? `Atleta ${idx + 1}` : `Dupla ${idx + 1}`}
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                        {registrationType === 'RANDOM_DRAW' ? <User size={18} /> : <Users size={18} />}
                      </div>
                      <input 
                        type="text"
                        placeholder={registrationType === 'RANDOM_DRAW' ? "Nome do atleta" : "Nome da dupla (Ex: João/Maria)"}
                        className="input-field pl-12"
                        value={player.name}
                        onChange={(e) => {
                          const newPlayers = [...players];
                          newPlayers[idx].name = e.target.value;
                          setPlayers(newPlayers);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {error && (
                <p className="text-error text-sm mb-4 font-bold flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
                  <AlertCircle size={18} /> {error}
                </p>
              )}
              <div className="flex gap-4">
                <button onClick={() => setStep('REGISTRATION_TYPE')} className="btn-outline flex-1">VOLTAR</button>
                <button onClick={handleAthletesConfirm} className="btn-primary flex-[2]">AVANÇAR</button>
              </div>
            </StepContainer>
          )}

          {step === 'TABLE_COUNT' && (
            <StepContainer 
              key="table-count"
              title="Quadras"
              subtitle="Selecione as quadras que serão utilizadas (1 a 12)."
              currentStep={6}
            >
              <div className="flex flex-col items-center gap-8">
                <div className="grid grid-cols-4 gap-3 w-full">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        if (selectedCourts.includes(num)) {
                          setSelectedCourts(selectedCourts.filter(c => c !== num));
                        } else {
                          setSelectedCourts([...selectedCourts, num].sort((a, b) => a - b));
                        }
                      }}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-xl font-bold text-lg transition-all border-2",
                        selectedCourts.includes(num) 
                          ? "bg-primary border-primary text-accent shadow-md" 
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="text-error text-sm font-bold flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100 w-full">
                    <AlertCircle size={18} /> {error}
                  </p>
                )}

                <div className="w-full flex gap-4">
                  <button onClick={() => setStep('ATHLETE_REGISTRATION')} className="btn-outline flex-1">VOLTAR</button>
                  <button onClick={handleStartTournament} className="btn-primary flex-[2] py-4">
                    INICIAR TORNEIO
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'TOURNAMENT' && tournament && (
            <motion.div 
              key="tournament"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Em Andamento</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 text-xs font-bold uppercase">Todos contra Todos</span>
                  </div>
                  <h2 className="text-3xl font-display font-bold text-primary">
                    Rodada {tournament.currentRound} <span className="text-slate-300 font-normal">de {tournament.totalRounds}</span>
                  </h2>
                </div>
                
                <div className="flex items-center gap-4">
                  {tournament.matches.filter(m => m.round === tournament.currentRound).every(m => m.isCompleted) ? (
                    <button 
                      onClick={nextRound} 
                      className="btn-primary py-3 px-8 flex items-center gap-2"
                    >
                      <span>{tournament.currentRound === tournament.totalRounds ? 'Finalizar Torneio' : 'Próxima Rodada'}</span>
                      <ChevronRight size={20} />
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-slate-50 rounded-xl text-slate-400 font-bold text-xs flex items-center gap-2 border border-slate-100">
                      <RefreshCw size={14} className="animate-spin" />
                      Aguardando conclusão das partidas...
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tournament.matches
                  .filter(m => m.round === tournament.currentRound)
                  .map((match) => {
                    const p1 = tournament.players.find(p => p.id === match.player1Id)!;
                    const p2 = tournament.players.find(p => p.id === match.player2Id)!;
                    const p1Games = match.isCompleted ? match.sets[0].player1 : match.currentSet.player1;
                    const p2Games = match.isCompleted ? match.sets[0].player2 : match.currentSet.player2;

                    return (
                      <div 
                        key={match.id} 
                        className={cn(
                          "glass-card p-6 transition-all duration-300",
                          match.isCompleted ? "match-finished" : "match-pending"
                        )}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <Waves size={14} />
                            Quadra {match.table}
                          </div>
                          {match.isCompleted && (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                              <CheckCircle2 size={16} />
                              Concluído
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 md:gap-4 mb-8">
                          <div className="flex-1 text-center min-w-0">
                            <div className="text-base md:text-lg font-bold text-primary mb-2 truncate px-1">{p1.name}</div>
                            <div className={cn(
                              "text-4xl md:text-5xl font-display font-black transition-colors",
                              p1Games > p2Games ? "text-accent" : "text-slate-300"
                            )}>
                              {p1Games}
                            </div>
                          </div>
                          <div className="text-slate-200 font-display font-black text-xl md:text-2xl italic shrink-0">VS</div>
                          <div className="flex-1 text-center min-w-0">
                            <div className="text-base md:text-lg font-bold text-primary mb-2 truncate px-1">{p2.name}</div>
                            <div className={cn(
                              "text-4xl md:text-5xl font-display font-black transition-colors",
                              p2Games > p1Games ? "text-accent" : "text-slate-300"
                            )}>
                              {p2Games}
                            </div>
                          </div>
                        </div>

                        {!match.isCompleted && (
                          <div className="space-y-5 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Placar da Partida</span>
                              {error && <span className="text-[10px] text-error font-bold uppercase text-right leading-tight">{error}</span>}
                            </div>
                            
                            <div className="flex items-center justify-between gap-2 md:gap-6">
                              {/* Player 1 Points */}
                              <div className="flex-1 flex flex-col items-center gap-3">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 1, -1)}
                                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-400"
                                  >
                                    <Minus size={16} className="md:w-5 md:h-5" />
                                  </button>
                                  <span className="text-2xl md:text-4xl font-display font-black text-primary w-8 md:w-12 text-center">
                                    {match.currentSet.player1}
                                  </span>
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 1, 1)}
                                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-primary text-white rounded-lg md:rounded-xl shadow-md hover:bg-primary/90"
                                  >
                                    <Plus size={16} className="md:w-5 md:h-5" />
                                  </button>
                                </div>
                              </div>

                              <div className="h-8 md:h-10 w-px bg-slate-200" />

                              {/* Player 2 Points */}
                              <div className="flex-1 flex flex-col items-center gap-3">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 2, -1)}
                                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-400"
                                  >
                                    <Minus size={16} className="md:w-5 md:h-5" />
                                  </button>
                                  <span className="text-2xl md:text-4xl font-display font-black text-primary w-8 md:w-12 text-center">
                                    {match.currentSet.player2}
                                  </span>
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 2, 1)}
                                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-primary text-white rounded-lg md:rounded-xl shadow-md hover:bg-primary/90"
                                  >
                                    <Plus size={16} className="md:w-5 md:h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => confirmSet(match.id)}
                              className="w-full py-3 bg-secondary text-white rounded-xl font-bold text-xs hover:bg-secondary/90 transition-all shadow-md uppercase tracking-widest"
                            >
                              Confirmar Resultado
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {step === 'FINISHED' && tournament && (
            <StepContainer 
              key="finished"
              title="Classificação Final"
              subtitle="O torneio foi concluído com sucesso!"
            >
              <div className="flex flex-col items-center">
                {(() => {
                  const rankings = calculateRankings(tournament.players, tournament.matches);
                  const champion = rankings[0];
                  return (
                    <>
                      <div className="relative mb-12">
                        <div className="bg-white p-10 rounded-full shadow-2xl border-4 border-amber-400">
                          <Trophy size={80} className="text-amber-400" />
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-400 text-white px-8 py-2 rounded-full font-black text-xl shadow-lg whitespace-nowrap">
                          CAMPEÃO
                        </div>
                      </div>
                      
                      <h3 className="text-4xl font-display font-black text-primary mb-10">{champion.name}</h3>

                      <div className="w-full space-y-3 mb-10">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Ranking Geral</h4>
                        {rankings.map((p, idx) => (
                          <div 
                            key={p.id} 
                            className={cn(
                              "flex items-center justify-between p-5 rounded-2xl border transition-all",
                              idx === 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <span className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm",
                                idx === 0 ? "bg-amber-400 text-white" : 
                                idx === 1 ? "bg-slate-300 text-white" :
                                idx === 2 ? "bg-amber-700 text-white" : "bg-slate-50 text-slate-400"
                              )}>
                                {idx + 1}º
                              </span>
                              <div>
                                <span className="font-bold text-primary block leading-none mb-1">{p.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.wins} Vitórias</span>
                              </div>
                            </div>
                            <div className="flex gap-6">
                              <div className="text-center">
                                <div className="text-emerald-500 font-display font-bold text-xl leading-none">{p.gamesWon}</div>
                                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">G. Pró</div>
                              </div>
                              <div className="text-center">
                                <div className="text-slate-300 font-display font-bold text-xl leading-none">{p.gamesLost}</div>
                                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">G. Contra</div>
                              </div>
                              <div className="text-center">
                                <div className={cn(
                                  "font-display font-bold text-xl leading-none",
                                  p.gameBalance >= 0 ? "text-primary" : "text-error"
                                )}>{p.gameBalance > 0 ? `+${p.gameBalance}` : p.gameBalance}</div>
                                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Saldo</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                <button onClick={resetApp} className="btn-primary w-full flex items-center justify-center gap-3 py-5">
                  <RefreshCw size={24} />
                  NOVO TORNEIO
                </button>
              </div>
            </StepContainer>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
