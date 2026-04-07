
"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Trophy, 
  RotateCcw, 
  FileText,
  Download,
  Shield,
  Layout,
  Share2,
  AlertCircle,
  Save,
  Loader2,
  Activity
} from "lucide-react";
import { MatchState, MatchEvent } from '@/types/match';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { TacticalPitch } from './tactical-pitch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const groupGoalsByPlayer = (events: MatchEvent[]) => {
  const grouped = events.reduce((acc, event) => {
    const key = event.playerName || 'Anónimo';
    if (!acc[key]) {
      acc[key] = {
        name: key,
        photoUrl: event.playerPhotoUrl,
        goals: []
      };
    }
    acc[key].goals.push({
      timestamp: event.timestamp,
      type: event.type,
      assistantName: event.assistantName
    });
    return acc;
  }, {} as Record<string, { name: string, photoUrl?: string, goals: { timestamp: string, type: string, assistantName?: string }[] }>);

  return Object.values(grouped);
};

const GoalList = ({ events, cards, teamName, teamColor }: { events: MatchEvent[], cards: MatchEvent[], teamName: string, teamColor: string }) => {
  const groupedPlayers = groupGoalsByPlayer(events);

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 mb-4 border-b-2 pb-2 border-${teamColor}/20`}>
        <Shield className={`h-5 w-5 text-${teamColor}`} />
        <span className="font-black text-sm uppercase tracking-widest">{teamName}</span>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-1">
          <Trophy className="h-3 w-3" /> Goles
        </h4>
        {groupedPlayers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">Sin anotaciones</p>
        ) : (
          groupedPlayers.map(player => (
            <div key={player.name} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-border/20">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarImage src={player.photoUrl || undefined} className="object-cover" />
                <AvatarFallback><Trophy className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate uppercase tracking-tighter">{player.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {player.goals.map((goal, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[9px] font-mono font-black h-5 px-1.5 bg-primary/10 text-primary border-none">
                      {goal.timestamp}' {goal.type === 'penalty' && "(P)"}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {cards.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Sanciones
          </h4>
          <div className="flex flex-wrap gap-2">
            {cards.map(card => (
              <div key={card.id} className="flex items-center gap-2 bg-secondary/5 border p-1.5 pr-3 rounded-lg animate-in zoom-in-95">
                <div className={`h-4 w-3 rounded-sm ${card.type === 'red_card' ? 'bg-red-600' : 'bg-yellow-400'}`} />
                <span className="text-[10px] font-black truncate max-w-[80px] uppercase">{card.playerName}</span>
                <span className="text-[9px] font-mono opacity-50">{card.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export function MatchSummary({ match, onRestart }: { match: MatchState; onRestart: () => void }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const handleSaveMatch = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'matches'), {
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        homeLogoUrl: match.homeTeam.logoUrl || "",
        awayLogoUrl: match.awayTeam.logoUrl || "",
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        events: match.events,
        date: Date.now(),
        ownerId: user.uid
      });
      setIsSaved(true);
      toast({ title: "¡Guardado!" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    const text = `⚽ SRFC HN - RESULTADO FINAL\n\n${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}\n\n¡Partidazo!`;
    if (navigator.share) {
      try { 
        await navigator.share({ title: 'Resultado SRFC', text }); 
      } catch (err) {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleDownloadFlyer = async () => {
    if (!flyerRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(flyerRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `resultado-srfc.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsDownloading(false);
    }
  };

  const homeGoalsEvents = match.events.filter(e => (e.type === 'goal' || e.type === 'penalty') && e.teamName === match.homeTeam.name);
  const awayGoalsEvents = match.events.filter(e => (e.type === 'goal' || e.type === 'penalty') && e.teamName === match.awayTeam.name);
  const homeCards = match.events.filter(e => (e.type === 'yellow_card' || e.type === 'red_card') && e.teamName === match.homeTeam.name);
  const awayCards = match.events.filter(e => (e.type === 'yellow_card' || e.type === 'red_card') && e.teamName === match.awayTeam.name);

  // Goleadores agrupados para el Flyer
  const homeScorers = groupGoalsByPlayer(homeGoalsEvents);
  const awayScorers = groupGoalsByPlayer(awayGoalsEvents);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="text-center space-y-6">
        <Badge className="bg-primary/20 text-primary px-8 py-2 rounded-full font-black uppercase text-xs tracking-widest">Finalizado</Badge>
        <div className="flex items-center justify-center gap-4 md:gap-12">
          <div className="flex-1 text-right space-y-4">
            <Avatar className="h-20 w-20 md:h-28 md:w-28 ml-auto border-4 border-primary/20 shadow-2xl">
              <AvatarImage src={match.homeTeam.logoUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-3xl font-black bg-secondary">{match.homeTeam.name[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl md:text-3xl font-black uppercase truncate">{match.homeTeam.name}</h2>
          </div>
          <div className="text-6xl md:text-9xl font-black flex items-center gap-4 text-primary tracking-tighter drop-shadow-2xl">
            {match.homeScore} <span className="text-muted-foreground/20 text-4xl">-</span> {match.awayScore}
          </div>
          <div className="flex-1 text-left space-y-4">
            <Avatar className="h-20 w-20 md:h-28 md:w-28 mr-auto border-4 border-accent/20 shadow-2xl">
              <AvatarImage src={match.awayTeam.logoUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-3xl font-black bg-secondary">{match.awayTeam.name[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl md:text-3xl font-black uppercase truncate">{match.awayTeam.name}</h2>
          </div>
        </div>
      </div>

      <Tabs defaultValue="stats" className="w-full max-w-4xl mx-auto">
        <div className="flex justify-center mb-6">
          <TabsList className="bg-secondary/20 p-1 rounded-xl h-12">
            <TabsTrigger value="stats" className="rounded-lg font-bold gap-2"><Activity className="h-4 w-4" /> Estadísticas</TabsTrigger>
            <TabsTrigger value="tactical" className="rounded-lg font-bold gap-2"><Layout className="h-4 w-4" /> Alineación</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="stats">
          <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-card/40 backdrop-blur-md">
            <CardHeader className="bg-secondary/5 border-b border-border/20 p-6">
              <CardTitle className="flex items-center justify-between text-xl font-black uppercase">
                <div className="flex items-center gap-3"><FileText className="text-primary" /> Desglose</div>
                <Button size="sm" variant="outline" onClick={handleShare} className="rounded-xl font-black gap-2"><Share2 className="h-4 w-4" /> COMPARTIR</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-12">
                <GoalList events={homeGoalsEvents} cards={homeCards} teamName={match.homeTeam.name} teamColor="primary" />
                <GoalList events={awayGoalsEvents} cards={awayCards} teamName={match.awayTeam.name} teamColor="accent" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tactical">
          <Card className="p-6 rounded-[2.5rem] bg-card/40 backdrop-blur-md border-none shadow-2xl">
            <TacticalPitch homeTeam={match.homeTeam} awayTeam={match.awayTeam} events={match.events} />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col md:flex-row gap-6 justify-center items-center pt-8">
        <Button variant="ghost" onClick={onRestart} className="px-10 h-16 rounded-2xl font-black uppercase tracking-widest text-xs">
          <RotateCcw className="mr-2 h-5 w-5" /> Nuevo
        </Button>
        {!isSaved ? (
          <Button onClick={handleSaveMatch} disabled={isSaving} variant="secondary" className="px-10 h-16 rounded-2xl font-black gap-2 shadow-xl">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} GUARDAR
          </Button>
        ) : (
          <Badge variant="outline" className="h-16 px-10 rounded-2xl border-green-500 text-green-500 font-black gap-2"><Save className="h-5 w-5" /> ARCHIVADO</Badge>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="px-16 h-16 rounded-2xl font-black text-lg shadow-2xl bg-primary hover:scale-[1.05] transition-all">
              <Layout className="mr-2 h-6 w-6" /> GENERAR FLYER
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[500px] w-[95vw] p-0 overflow-hidden bg-transparent border-none shadow-none">
            <DialogHeader className="p-4 bg-background/90 backdrop-blur-xl rounded-t-[2rem]">
              <DialogTitle className="text-center font-black uppercase tracking-tighter">Flyer de Resultado</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh] bg-background/90 backdrop-blur-xl rounded-b-[2rem]">
              <div className="p-4 flex flex-col gap-6">
                <div ref={flyerRef} className="w-full aspect-[4/5] bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] p-8 flex flex-col relative overflow-hidden rounded-3xl border-4 border-primary/30">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -mr-40 -mt-40" />
                  <div className="relative z-10 flex flex-col items-center mb-6">
                    <Shield className="h-8 w-8 text-primary mb-2" />
                    <h3 className="text-3xl font-black text-white">SRFC</h3>
                    <p className="text-[8px] tracking-[0.4em] font-black text-primary uppercase">Resultados HN</p>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-6 my-auto">
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <Avatar className="h-20 w-20 border-2 border-primary shadow-xl">
                          <AvatarImage src={match.homeTeam.logoUrl || undefined} className="object-cover" />
                          <AvatarFallback className="bg-slate-800 text-white font-black">{match.homeTeam.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-white font-black uppercase text-[10px] tracking-wider text-center line-clamp-1">{match.homeTeam.name}</span>
                      </div>
                      <div className="text-6xl font-black text-white drop-shadow-2xl">
                        {match.homeScore}
                        <span className="text-primary opacity-40 mx-2">-</span>
                        {match.awayScore}
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <Avatar className="h-20 w-20 border-2 border-accent shadow-xl">
                          <AvatarImage src={match.awayTeam.logoUrl || undefined} className="object-cover" />
                          <AvatarFallback className="bg-slate-800 text-white font-black">{match.awayTeam.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-white font-black uppercase text-[10px] tracking-wider text-center line-clamp-1">{match.awayTeam.name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 w-full gap-4 mt-4">
                      <div className="space-y-1 text-right">
                        {homeScorers.map((s, idx) => (
                          <div key={idx} className="text-[10px] font-black text-white/90 uppercase">
                            <span className="text-primary mr-1">⚽</span>
                            {s.name} ({s.goals.map(g => g.timestamp).join("', ")}')
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1 text-left border-l border-white/10 pl-4">
                        {awayScorers.map((s, idx) => (
                          <div key={idx} className="text-[10px] font-black text-white/90 uppercase">
                            <span className="text-accent mr-1">⚽</span>
                            {s.name} ({s.goals.map(g => g.timestamp).join("', ")}')
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-6 text-center">
                    <div className="h-1 w-20 bg-primary/40 mx-auto rounded-full mb-2" />
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Partido Finalizado</p>
                  </div>
                </div>
                <Button onClick={handleDownloadFlyer} disabled={isDownloading} className="w-full h-16 rounded-2xl font-black text-lg bg-primary shadow-2xl mb-4">
                  {isDownloading ? "PROCESANDO..." : <><Download className="mr-2 h-6 w-6" /> DESCARGAR FLYER</>}
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
