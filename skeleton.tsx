
"use client";

import React, { useState, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, Camera, Image as ImageIcon, Trash2, Loader2, Save, User as UserIcon, Pencil, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Player, Team } from '@/types/match';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const ADMIN_UID = 'KUGGtODNwCYss4UX64TW7bvIwxt2';

const POSITIONS = [
  { label: 'Portero', value: 'GK' },
  { label: 'Defensa', value: 'DEF' },
  { label: 'Medio', value: 'MID' },
  { label: 'Delantero', value: 'FWD' },
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

const PlayerEditRow = React.memo(({ 
  player, 
  index, 
  onUpdate, 
  onRemove, 
  onFileUpload 
}: { 
  player: Player, 
  index: number, 
  onUpdate: (idx: number, field: keyof Player, value: any) => void,
  onRemove: (idx: number) => void,
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => void
}) => (
  <div className="flex flex-col gap-3 p-4 bg-background/40 rounded-3xl border border-border/20 group/player hover:border-accent/40 transition-all">
    <div className="flex items-center gap-4">
      <div className="relative w-14 h-14 flex-shrink-0">
        <input 
          type="file" 
          accept="image/*" 
          className="absolute inset-0 opacity-0 cursor-pointer z-[60]" 
          onChange={(e) => onFileUpload(e, (url) => onUpdate(index, 'photoUrl', url))} 
        />
        <Avatar className="h-14 w-14 border-2 border-accent/20 shadow-md">
          <AvatarImage src={player.photoUrl || undefined} className="object-cover" />
          <AvatarFallback className="bg-secondary/30"><UserIcon className="h-6 w-6 opacity-20" /></AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-accent p-1.5 rounded-lg text-white scale-75 shadow-lg border-2 border-background">
          <Camera className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <Input 
          placeholder={`Nombre...`} 
          className="h-10 rounded-xl font-bold bg-background/30 border-none"
          value={player.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
        />
        <div className="flex gap-2">
          <Input 
            placeholder="Nº" 
            className="h-8 w-16 rounded-lg text-xs font-black text-center"
            value={player.number || ''}
            onChange={(e) => onUpdate(index, 'number', e.target.value)}
          />
          <Select 
            value={player.position || 'DEF'} 
            onValueChange={(v) => onUpdate(index, 'position', v)}
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
      <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="text-destructive/40 hover:text-destructive">
        <X className="h-5 w-5" />
      </Button>
    </div>
  </div>
));
PlayerEditRow.displayName = "PlayerEditRow";

export function TeamManagement() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const teamsQuery = useMemoFirebase(() => collection(db, 'teams'), [db]);
  const { data: teams, loading } = useCollection<Team & { id: string, ownerId?: string }>(teamsQuery);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newTeam, setNewTeam] = useState({ name: "", logoUrl: "" });
  const [newPlayers, setNewPlayers] = useState<Player[]>([{ id: '1', name: '', position: 'GK', number: '1' }]);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.uid === ADMIN_UID;

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

  const addPlayerRow = () => {
    setNewPlayers(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: '', position: 'DEF', number: '' }]);
  };

  const removePlayerRow = (idx: number) => {
    setNewPlayers(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const updatePlayer = (idx: number, field: keyof Player, value: any) => {
    setNewPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const startEditing = (team: Team & { id: string }) => {
    setEditingTeamId(team.id);
    setNewTeam({ name: team.name, logoUrl: team.logoUrl || "" });
    setNewPlayers(team.players?.length ? [...team.players] : [{ id: '1', name: '', position: 'GK', number: '1' }]);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingTeamId(null);
    setNewTeam({ name: "", logoUrl: "" });
    setNewPlayers([{ id: '1', name: '', position: 'GK', number: '1' }]);
  };

  const saveTeam = async () => {
    if (!user || !newTeam.name.trim()) return;
    setIsSaving(true);
    const teamData = {
      name: newTeam.name.trim(),
      logoUrl: newTeam.logoUrl,
      players: newPlayers.filter(p => p.name.trim() !== ''),
      ownerId: user.uid,
      updatedAt: serverTimestamp()
    };

    const promise = editingTeamId 
      ? updateDoc(doc(db, 'teams', editingTeamId), teamData)
      : addDoc(collection(db, 'teams'), { ...teamData, createdAt: serverTimestamp() });

    promise.then(() => {
      toast({ title: "Guardado" });
      cancelEdit();
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: editingTeamId ? `teams/${editingTeamId}` : 'teams',
        operation: editingTeamId ? 'update' : 'create',
        requestResourceData: teamData
      }));
    }).finally(() => setIsSaving(false));
  };

  const deleteTeam = async (id: string) => {
    if (!isAdmin) return;
    if (confirm("¿Eliminar permanentemente?")) {
      deleteDoc(doc(db, 'teams', id)).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `teams/${id}`, operation: 'delete' }));
      });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
      <p className="text-xs font-black uppercase opacity-40 tracking-widest">Consultando...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center bg-card/40 p-8 rounded-[2rem] border border-border/40 backdrop-blur-xl gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black tracking-tighter flex items-center justify-center md:justify-start gap-3 uppercase">
            <ShieldCheck className="text-primary h-8 w-8" /> Base de Datos
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">Gestión táctica de clubes y plantillas</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="rounded-2xl font-black gap-2 h-14 px-8 text-lg shadow-2xl">
            <Plus className="h-6 w-6" /> NUEVO CLUB
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="rounded-[3rem] border-primary/20 bg-card/60 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <CardHeader className="p-8 pb-0 flex flex-row justify-between items-center">
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              {editingTeamId ? <Pencil className="h-6 w-6 text-primary" /> : <Plus className="h-6 w-6 text-primary" />}
              {editingTeamId ? "Editar Club" : "Registrar Club"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={cancelEdit} className="rounded-full h-12 w-12"><X className="h-6 w-6" /></Button>
          </CardHeader>
          
          <CardContent className="p-8 space-y-10">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Escudo</Label>
                <div className="relative w-44 h-44 mx-auto">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-[70]" 
                    onChange={(e) => handleFileUpload(e, (url) => setNewTeam(prev => ({...prev, logoUrl: url})))} 
                  />
                  <Avatar className="h-44 w-44 border-8 border-background shadow-2xl">
                    <AvatarImage src={newTeam.logoUrl || undefined} className="object-cover" />
                    <AvatarFallback className="bg-secondary/50"><ImageIcon className="h-16 w-16 opacity-30" /></AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-primary p-4 rounded-2xl text-white shadow-2xl ring-4 ring-background z-10">
                    <Camera className="h-7 w-7" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-50 ml-2">Nombre</Label>
                  <Input 
                    placeholder="Nombre oficial..." 
                    className="h-16 rounded-2xl font-black text-xl px-6 bg-background/50 border-2" 
                    value={newTeam.name}
                    onChange={(e) => setNewTeam(prev => ({...prev, name: e.target.value}))}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <Label className="text-[10px] font-black uppercase tracking-widest text-accent">Plantilla Táctica</Label>
                <ScrollArea className="h-[450px] pr-4 border rounded-3xl p-2 bg-background/20">
                  <div className="space-y-4">
                    {newPlayers.map((player, idx) => (
                      <PlayerEditRow key={player.id} player={player} index={idx} onUpdate={updatePlayer} onRemove={removePlayerRow} onFileUpload={handleFileUpload} />
                    ))}
                  </div>
                </ScrollArea>
                <Button variant="outline" className="w-full border-dashed rounded-[1.5rem] h-16 font-black text-xs uppercase" onClick={addPlayerRow}>
                  <Plus className="mr-2 h-5 w-5" /> AGREGAR JUGADOR
                </Button>
              </div>
            </div>

            <Button onClick={saveTeam} disabled={isSaving} className="w-full h-20 rounded-[2rem] text-2xl font-black gap-4 shadow-2xl bg-primary">
              {isSaving ? <Loader2 className="h-8 w-8 animate-spin" /> : <Save className="h-8 w-8" />}
              GUARDAR CAMBIOS
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {teams?.map((team) => (
          <Card key={team.id} className="rounded-[2.5rem] border-none bg-card/40 backdrop-blur-xl shadow-xl overflow-hidden group hover:ring-4 hover:ring-primary/20 transition-all">
            <CardContent className="p-8">
              <div className="flex items-center gap-8">
                <Avatar className="h-24 w-24 border-4 border-primary/10 shadow-xl group-hover:scale-110 transition-transform">
                  <AvatarImage src={team.logoUrl || undefined} className="object-cover" />
                  <AvatarFallback className="font-black text-2xl">{team.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-black truncate uppercase tracking-tighter">{team.name}</h3>
                  <Badge variant="secondary" className="mt-2 h-5 px-3 text-[10px] font-black">{team.players?.length || 0} JUGADORES</Badge>
                </div>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  {(isAdmin || user?.uid === team.ownerId) && (
                    <Button variant="secondary" size="icon" onClick={() => startEditing(team)} className="h-12 w-12 rounded-2xl"><Pencil className="h-5 w-5" /></Button>
                  )}
                  {isAdmin && (
                    <Button variant="destructive" size="icon" onClick={() => deleteTeam(team.id)} className="h-12 w-12 rounded-2xl"><Trash2 className="h-5 w-5" /></Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
