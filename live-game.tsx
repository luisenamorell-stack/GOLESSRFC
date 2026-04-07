
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Camera, Plus, X, Save, Shield } from "lucide-react";
import { MatchState, Team, Player } from '@/types/match';
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

const POSITIONS = [
  { label: 'POR', value: 'GK' },
  { label: 'DEF', value: 'DEF' },
  { label: 'MED', value: 'MID' },
  { label: 'DEL', value: 'FWD' },
];

const compressImage = (file: File, maxWidth = 400): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
    };
  });
};

const PlayerSetupRow = React.memo(({ 
  player, 
  side, 
  onUpdate, 
  onRemove, 
  onFileUpload 
}: { 
  player: Player, 
  side: 'home' | 'away', 
  onUpdate: (side: 'home' | 'away', id: string, field: keyof Player, value: any) => void,
  onRemove: (side: 'home' | 'away', id: string) => void,
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => void
}) => (
  <div className="flex flex-col gap-2 bg-background/30 p-3 rounded-2xl border border-border/20 group/player">
    <div className="flex items-center gap-3">
      <div className="relative h-12 w-12 flex-shrink-0">
        <input 
          type="file" 
          accept="image/*" 
          className="absolute inset-0 opacity-0 cursor-pointer z-[100]" 
          onChange={(e) => onFileUpload(e, (url) => onUpdate(side, player.id, 'photoUrl', url))}
        />
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={player.photoUrl || undefined} className="object-cover" />
          <AvatarFallback className="bg-secondary/50"><Camera className="h-5 w-5 opacity-30" /></AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 space-y-2">
        <Input 
          placeholder="Nombre..." 
          className="h-9 rounded-lg text-sm font-bold"
          value={player.name}
          onChange={(e) => onUpdate(side, player.id, 'name', e.target.value)}
        />
        <div className="flex gap-2">
          <Input 
            placeholder="Nº" 
            className="h-8 w-14 rounded-lg text-xs text-center font-black"
            value={player.number || ''}
            onChange={(e) => onUpdate(side, player.id, 'number', e.target.value)}
          />
          <Select 
            value={player.position || 'DEF'} 
            onValueChange={(v) => onUpdate(side, player.id, 'position', v)}
          >
            <SelectTrigger className="h-8 rounded-lg text-[10px] font-black uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onRemove(side, player.id)} 
        className="h-8 w-8 text-destructive opacity-40 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  </div>
));
PlayerSetupRow.displayName = "PlayerSetupRow";

export function MatchSetup({ onStart }: { onStart: (match: MatchState) => void }) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const teamsQuery = useMemoFirebase(() => collection(db, 'teams'), [db]);
  const { data: registeredTeams, loading } = useCollection<Team & { id: string }>(teamsQuery);
  
  const [isManualMode, setIsManualMode] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [manualHomeName, setManualHomeName] = useState("");
  const [manualAwayName, setManualAwayName] = useState("");
  const [manualHomeLogo, setManualHomeLogo] = useState("");
  const [manualAwayLogo, setManualAwayLogo] = useState("");
  const [manualHomePlayers, setManualHomePlayers] = useState<Player[]>([{ id: 'h1', name: '', position: 'GK', number: '1' }]);
  const [manualAwayPlayers, setManualAwayPlayers] = useState<Player[]>([{ id: 'a1', name: '', position: 'GK', number: '1' }]);
  const [duration, setDuration] = useState(40);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        callback(compressed);
        e.target.value = ''; 
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo procesar la foto." });
      }
    }
  }, [toast]);

  const addPlayer = (side: 'home' | 'away') => {
    const newPlayer: Player = { id: Math.random().toString(36).substr(2, 9), name: '', position: 'DEF', number: '' };
    if (side === 'home') setManualHomePlayers(prev => [...prev, newPlayer]);
    else setManualAwayPlayers(prev => [...prev, newPlayer]);
  };

  const removePlayer = (side: 'home' | 'away', id: string) => {
    if (side === 'home') setManualHomePlayers(p => p.filter(x => x.id !== id));
    else setManualAwayPlayers(p => p.filter(x => x.id !== id));
  };

  const updatePlayer = (side: 'home' | 'away', id: string, field: keyof Player, value: any) => {
    if (side === 'home') setManualHomePlayers(p => p.map(x => x.id === id ? { ...x, [field]: value } : x));
    else setManualAwayPlayers(p => p.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const handleStart = () => {
    let home: Team | undefined;
    let away: Team | undefined;

    if (isManualMode) {
      if (!manualHomeName.trim() || !manualAwayName.trim()) {
        toast({ variant: "destructive", title: "Error", description: "Nombres requeridos." });
        return;
      }
      home = { name: manualHomeName, players: manualHomePlayers.filter(p => p.name.trim() !== ''), logoUrl: manualHomeLogo };
      away = { name: manualAwayName, players: manualAwayPlayers.filter(p => p.name.trim() !== ''), logoUrl: manualAwayLogo };
    } else {
      home = registeredTeams?.find(t => t.id === homeTeamId);
      away = registeredTeams?.find(t => t.id === awayTeamId);
    }

    if (!home || !away) {
      toast({ variant: "destructive", title: "Error", description: "Selecciona los equipos." });
      return;
    }

    onStart({
      id: Math.random().toString(36).substr(2, 9),
      homeTeam: home,
      awayTeam: away,
      homeScore: 0,
      awayScore: 0,
      durationMinutes: duration,
      events: [],
      status: 'live',
      startTime: Date.now()
    });
  };

  const saveManualTeam = async (side: 'home' | 'away') => {
    if (!user) return;
    const name = side === 'home' ? manualHomeName : manualAwayName;
    const players = (side === 'home' ? manualHomePlayers : manualAwayPlayers).filter(p => p.name.trim() !== '');
    if (!name.trim()) return;

    setIsSavingToDb(true);
    try {
      await addDoc(collection(db, 'teams'), {
        name,
        logoUrl: side === 'home' ? manualHomeLogo : manualAwayLogo,
        players,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      toast({ title: "Guardado" });
    } finally {
      setIsSavingToDb(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8 px-4 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-5 bg-primary/10 rounded-3xl mb-2 rotate-3 shadow-inner">
          <Trophy className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground uppercase">
          SRFC <span className="text-primary italic block text-2xl md:text-4xl">PREPARACIÓN</span>
        </h1>
        
        <div className="flex items-center justify-center gap-4 mt-8">
          <Label className={!isManualMode ? 'text-primary font-black' : 'opacity-40'}>DB</Label>
          <Switch checked={isManualMode} onCheckedChange={setIsManualMode} />
          <Label className={isManualMode ? 'text-accent font-black' : 'opacity-40'}>Manual</Label>
        </div>
      </div>

      <Card className="border-none bg-card/40 backdrop-blur-xl rounded-[3rem] shadow-2xl p-8 sm:p-12">
        <div className="grid md:grid-cols-3 items-start gap-12">
          
          {/* Local */}
          <div className="space-y-6 text-center">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Local</Label>
            <div className="relative w-32 h-32 mx-auto">
              {isManualMode && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={(e) => handleFileUpload(e, setManualHomeLogo)} />}
              <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-2xl">
                <AvatarImage src={(!isManualMode ? registeredTeams?.find(t => t.id === homeTeamId)?.logoUrl : manualHomeLogo) || undefined} className="object-cover" />
                <AvatarFallback className="bg-secondary/50"><Camera className="h-10 w-10 opacity-30" /></AvatarFallback>
              </Avatar>
            </div>
            
            {!isManualMode ? (
              <Select onValueChange={setHomeTeamId} value={homeTeamId}>
                <SelectTrigger className="h-14 rounded-2xl font-black uppercase"><SelectValue placeholder="SELECCIONAR..." /></SelectTrigger>
                <SelectContent>{registeredTeams?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <div className="space-y-4">
                <Input placeholder="NOMBRE LOCAL..." className="h-14 rounded-2xl font-black text-center" value={manualHomeName} onChange={(e) => setManualHomeName(e.target.value)} />
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black opacity-40 uppercase">Plantilla</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => addPlayer('home')} className="h-6 px-2 text-[10px] font-black"><Plus className="h-3 w-3 mr-1" /> JUGADOR</Button>
                      <Button variant="ghost" size="sm" onClick={() => saveManualTeam('home')} disabled={isSavingToDb} className="h-6 px-2 text-[10px] font-black text-green-500"><Save className="h-3 w-3 mr-1" /> GUARDAR</Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {manualHomePlayers.map(p => <PlayerSetupRow key={p.id} player={p} side="home" onUpdate={updatePlayer} onRemove={removePlayer} onFileUpload={handleFileUpload} />)}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center opacity-10 italic">
            <span className="text-8xl font-black">VS</span>
          </div>

          {/* Visitante */}
          <div className="space-y-6 text-center">
            <Label className="text-[10px] font-black uppercase tracking-widest text-accent">Visitante</Label>
            <div className="relative w-32 h-32 mx-auto">
              {isManualMode && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={(e) => handleFileUpload(e, setManualAwayLogo)} />}
              <Avatar className="h-32 w-32 border-4 border-accent/20 shadow-2xl">
                <AvatarImage src={(!isManualMode ? registeredTeams?.find(t => t.id === awayTeamId)?.logoUrl : manualAwayLogo) || undefined} className="object-cover" />
                <AvatarFallback className="bg-secondary/50"><Camera className="h-10 w-10 opacity-30" /></AvatarFallback>
              </Avatar>
            </div>
            
            {!isManualMode ? (
              <Select onValueChange={setAwayTeamId} value={awayTeamId}>
                <SelectTrigger className="h-14 rounded-2xl font-black uppercase"><SelectValue placeholder="SELECCIONAR..." /></SelectTrigger>
                <SelectContent>{registeredTeams?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <div className="space-y-4">
                <Input placeholder="NOMBRE VISITANTE..." className="h-14 rounded-2xl font-black text-center" value={manualAwayName} onChange={(e) => setManualAwayName(e.target.value)} />
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black opacity-40 uppercase">Plantilla</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => addPlayer('away')} className="h-6 px-2 text-[10px] font-black"><Plus className="h-3 w-3 mr-1" /> JUGADOR</Button>
                      <Button variant="ghost" size="sm" onClick={() => saveManualTeam('away')} disabled={isSavingToDb} className="h-6 px-2 text-[10px] font-black text-green-500"><Save className="h-3 w-3 mr-1" /> GUARDAR</Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {manualAwayPlayers.map(p => <PlayerSetupRow key={p.id} player={p} side="away" onUpdate={updatePlayer} onRemove={removePlayer} onFileUpload={handleFileUpload} />)}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t border-border/20">
          <div className="flex items-center gap-6">
            <Clock className="h-8 w-8 text-foreground/40" />
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase opacity-40">Duración (min)</Label>
              <Input type="number" className="w-24 text-2xl font-black text-center h-12 rounded-xl" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <Button onClick={handleStart} size="lg" className="w-full md:w-auto px-16 h-20 text-2xl font-black rounded-3xl shadow-2xl bg-primary hover:scale-[1.02] transition-all">
            INICIAR PARTIDO
          </Button>
        </div>
      </Card>
    </div>
  );
}
