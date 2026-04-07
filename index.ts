
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Timer, 
  Play, 
  Pause, 
  Square, 
  Activity, 
  Trophy,
  CornerDownRight,
  Target,
  User,
  ArrowRightLeft,
  Layout
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { MatchState, MatchEvent, Player } from '@/types/match';
import { useToast } from "@/hooks/use-toast";
import { TacticalPitch } from './tactical-pitch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LiveGameProps {
  initialMatch: MatchState;
  onFinish: (finalMatch: MatchState) => void;
}

export function LiveGame({ initialMatch, onFinish }: LiveGameProps) {
  const [match, setMatch] = useState<MatchState>(initialMatch);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [viewMode, setViewMode] = useState<'controls' | 'tactical'>('controls');
  
  const startTimeRef = useRef<number | null>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<MatchEvent['type'] | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isAssistantStep, setIsAssistantStep] = useState(false);
  const [currentScorer, setCurrentScorer] = useState<Player | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const sessionElapsed = Math.floor((now - startTimeRef.current) / 1000);
          setElapsedSeconds(accumulatedTimeRef.current + sessionElapsed);
        }
      }, 500);
    } else {
      if (startTimeRef.current) {
        accumulatedTimeRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
        startTimeRef.current = null;
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive]);

  const formatTime = useCallback((seconds: number) => {
    // Estándar de fútbol: 0s-59s es el minuto 1.
    const mins = Math.floor(seconds / 60) + 1;
    return `${mins}'`;
  }, []);

  const handleFinish = () => {
    setIsActive(false);
    onFinish({ ...match, status: 'finished' });
  };

  const registerEvent = (team: 'home' | 'away', type: MatchEvent['type'], player?: Player) => {
    const timestamp = formatTime(elapsedSeconds);
    const typeLabels: Record<string, string> = {
      goal: 'GOL',
      corner_kick: 'CÓRNER',
      penalty: 'GOL DE PENAL',
      yellow_card: 'AMARILLA',
      red_card: 'ROJA',
      substitution: 'CAMBIO'
    };

    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      teamName: team === 'home' ? match.homeTeam.name : match.awayTeam.name,
      playerName: player?.name,
      playerPhotoUrl: player?.photoUrl,
      timestamp,
      description: `${typeLabels[type] || type} de ${player?.name || 'Equipo'}`
    };

    const newMatch = { ...match };
    newMatch.events = [...newMatch.events, newEvent];
    
    if (type === 'penalty') {
      if (team === 'home') newMatch.homeScore += 1;
      else newMatch.awayScore += 1;
    }

    setMatch(newMatch);
    setIsEventDialogOpen(false);
    toast({ title: `${typeLabels[type]} Registrado`, description: `Al minuto ${timestamp}` });
  };

  const finalizeGoalFlow = (assistant?: Player) => {
    const team = selectedTeam!;
    const timestamp = formatTime(elapsedSeconds);
    
    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'goal',
      teamName: team === 'home' ? match.homeTeam.name : match.awayTeam.name,
      playerName: currentScorer?.name || 'Equipo',
      playerPhotoUrl: currentScorer?.photoUrl,
      assistantName: assistant?.name,
      assistantPhotoUrl: assistant?.photoUrl,
      timestamp,
      description: `GOL de ${currentScorer?.name || 'Equipo'}${assistant ? ` (Asist: ${assistant.name})` : ''}`
    };

    const newMatch = { ...match };
    newMatch.events = [...newMatch.events, newEvent];
    if (team === 'home') newMatch.homeScore += 1;
    else newMatch.awayScore += 1;

    setMatch(newMatch);
    setIsEventDialogOpen(false);
    setIsAssistantStep(false);
    setCurrentScorer(null);
    toast({ title: "¡GOL!", description: "Marcador actualizado." });
  };

  const openEventDialog = (team: 'home' | 'away', type: MatchEvent['type']) => {
    setSelectedTeam(team);
    setSelectedEventType(type);
    setIsAssistantStep(false);
    setCurrentScorer(null);
    setIsEventDialogOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Card className="bg-card border-none shadow-2xl overflow-hidden rounded-3xl">
        <div className="bg-primary/5 p-6 flex flex-col items-center border-b border-primary/10">
          <Badge variant="outline" className="mb-4 text-primary animate-pulse uppercase tracking-widest font-black">En Vivo</Badge>
          <div className="flex items-center gap-6 text-7xl md:text-9xl font-mono font-black tabular-nums tracking-tighter">
            <Timer className="h-10 w-10 md:h-16 md:w-16 text-primary" />
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        <CardContent className="p-8">
          <div className="grid grid-cols-3 items-center gap-8">
            <div className="text-center space-y-4">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto border-4 border-primary/20 shadow-xl">
                <AvatarImage src={match.homeTeam.logoUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl font-black">{match.homeTeam.name[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl md:text-2xl font-black truncate uppercase">{match.homeTeam.name}</h2>
              <div className="text-6xl md:text-8xl font-black text-primary drop-shadow-sm">{match.homeScore}</div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <span className="text-2xl md:text-4xl font-black opacity-20 italic">VS</span>
              <div className="flex gap-3">
                <Button size="icon" variant="secondary" onClick={() => setIsActive(!isActive)} className="h-14 w-14 rounded-2xl shadow-lg">
                  {isActive ? <Pause /> : <Play />}
                </Button>
                <Button size="icon" variant="destructive" onClick={handleFinish} className="h-14 w-14 rounded-2xl shadow-lg shadow-destructive/20">
                  <Square />
                </Button>
              </div>
            </div>

            <div className="text-center space-y-4">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto border-4 border-accent/20 shadow-xl">
                <AvatarImage src={match.awayTeam.logoUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl font-black">{match.awayTeam.name[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl md:text-2xl font-black truncate uppercase">{match.awayTeam.name}</h2>
              <div className="text-6xl md:text-8xl font-black text-accent drop-shadow-sm">{match.awayScore}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="bg-secondary/20 p-1 rounded-xl h-12">
              <TabsTrigger value="controls" className="rounded-lg font-bold gap-2">
                <Activity className="h-4 w-4" /> Panel
              </TabsTrigger>
              <TabsTrigger value="tactical" className="rounded-lg font-bold gap-2">
                <Layout className="h-4 w-4" /> Alineación
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="controls" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {['home', 'away'].map((side: any) => (
                <Card key={side} className={`border-${side === 'home' ? 'primary' : 'accent'}/20 shadow-xl rounded-3xl overflow-hidden`}>
                  <div className={`h-2 bg-${side === 'home' ? 'primary' : 'accent'}`} />
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2">
                      {side === 'home' ? match.homeTeam.name : match.awayTeam.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => openEventDialog(side, 'goal')} className={`h-16 font-black text-lg rounded-2xl col-span-2 ${side === 'home' ? 'bg-primary' : 'bg-accent'}`}>
                        <Trophy className="mr-2 h-6 w-6" /> GOL
                      </Button>
                      <Button onClick={() => openEventDialog(side, 'corner_kick')} variant="outline" className="h-14 rounded-2xl font-bold">
                        <CornerDownRight className="mr-2" /> CÓRNER
                      </Button>
                      <Button onClick={() => openEventDialog(side, 'penalty')} variant="outline" className="h-14 rounded-2xl font-bold">
                        <Target className="mr-2" /> PENAL
                      </Button>
                      <Button onClick={() => openEventDialog(side, 'substitution')} variant="outline" className="h-14 rounded-2xl font-bold">
                        <ArrowRightLeft className="mr-2" /> CAMBIO
                      </Button>
                      <Button onClick={() => openEventDialog(side, 'yellow_card')} variant="outline" className="h-14 rounded-2xl font-bold border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500 text-[10px]">
                        AMARILLA
                      </Button>
                      <Button onClick={() => openEventDialog(side, 'red_card')} variant="outline" className="h-14 rounded-2xl font-bold border-red-500/50 hover:bg-red-500/10 text-red-500 text-[10px]">
                        ROJA
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-3xl shadow-xl overflow-hidden border-none bg-card/50 backdrop-blur-md">
              <CardContent className="p-8">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <Activity className="text-primary" /> LÍNEA DE TIEMPO
                </h3>
                <div className="space-y-4">
                  {match.events.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground italic">Esperando eventos del partido...</div>
                  ) : (
                    match.events.slice().reverse().map((event) => (
                      <div key={event.id} className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/10 border border-border/20">
                        <Badge variant="secondary" className="font-mono text-xs">{event.timestamp}</Badge>
                        <div className="flex-1 flex items-center gap-4">
                          <Avatar className="h-10 w-10 border-2 border-background ring-2 ring-primary/20">
                            <AvatarImage src={event.playerPhotoUrl || undefined} className="object-cover" />
                            <AvatarFallback><User /></AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-black opacity-40 tracking-widest">{event.teamName}</span>
                            <div className="flex items-center gap-2">
                              {event.type === 'goal' && <Trophy className="h-4 w-4 text-yellow-500" />}
                              {event.type === 'penalty' && <Target className="h-4 w-4 text-primary" />}
                              {event.type === 'substitution' && <ArrowRightLeft className="h-4 w-4 text-green-500" />}
                              {event.type === 'yellow_card' && <div className="h-4 w-3 bg-yellow-400 rounded-sm" />}
                              {event.type === 'red_card' && <div className="h-4 w-3 bg-red-600 rounded-sm" />}
                              <span className="font-bold text-sm">{event.description}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tactical">
            <Card className="p-4 rounded-3xl bg-card/50 backdrop-blur-md border-none shadow-2xl">
              <TacticalPitch 
                homeTeam={match.homeTeam} 
                awayTeam={match.awayTeam} 
                events={match.events} 
              />
              <div className="mt-6 p-4 bg-secondary/20 rounded-2xl text-center">
                <p className="text-xs font-bold opacity-60 uppercase tracking-widest">
                  Visualización táctica de las plantillas en tiempo real
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black tracking-tighter uppercase">
              {!isAssistantStep ? "Seleccionar Jugador" : "Seleccionar Asistencia"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {(selectedTeam === 'home' ? match.homeTeam.players : match.awayTeam.players)
              ?.filter(p => !isAssistantStep || p.id !== currentScorer?.id)
              .map((player) => (
                <Button 
                  key={player.id} 
                  variant="outline" 
                  className="h-28 flex-col gap-3 rounded-2xl border-2 hover:border-primary transition-all group"
                  onClick={() => {
                    if (selectedEventType === 'goal' && !isAssistantStep) {
                      setCurrentScorer(player);
                      setIsAssistantStep(true);
                    } else if (isAssistantStep) {
                      finalizeGoalFlow(player);
                    } else {
                      registerEvent(selectedTeam!, selectedEventType!, player);
                    }
                  }}
                >
                  <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-primary transition-all">
                    <AvatarImage src={player.photoUrl || undefined} className="object-cover" />
                    <AvatarFallback className="font-black">{player.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-xs truncate w-full px-2 uppercase">{player.name}</span>
                    <Badge variant="secondary" className="text-[8px] h-3 px-1 mt-1 opacity-50">{player.position || 'POR DEFINIR'}</Badge>
                  </div>
                </Button>
              ))}
            <Button 
              variant="ghost" 
              className="h-28 border-2 border-dashed rounded-2xl font-black text-xs opacity-50 hover:opacity-100"
              onClick={() => {
                if (isAssistantStep) finalizeGoalFlow(undefined);
                else registerEvent(selectedTeam!, selectedEventType!, undefined);
              }}
            >
              SIN LISTAR / OTRO
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
