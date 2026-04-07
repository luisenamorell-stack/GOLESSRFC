
"use client";

import React, { useState, useEffect } from 'react';
import { MatchSetup } from '@/components/match-setup';
import { LiveGame } from '@/components/live-game';
import { MatchSummary } from '@/components/match-summary';
import { TeamManagement } from '@/components/team-management';
import { MatchHistory } from '@/components/match-history';
import { MatchState } from '@/types/match';
import { Shield, LogOut, User, Users, History } from 'lucide-react';
import { AuthGate } from '@/components/auth-gate';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [activeTab, setActiveTab] = useState("match");
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { user } = useUser();
  const auth = useAuth();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const startMatch = (match: MatchState) => {
    setMatchState(match);
  };

  const finishMatch = (finalMatch: MatchState) => {
    setMatchState(finalMatch);
  };

  const reset = () => {
    setMatchState(null);
    setActiveTab("match");
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <AuthGate>
      <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30">
        {/* Header */}
        <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
          <div className="container mx-auto h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={reset}>
              <div className="bg-primary p-1.5 rounded-lg rotate-12 transition-transform group-hover:rotate-0">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-headline font-black text-xl tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase">
                SRFC HN
              </span>
            </div>
            
            <nav className="flex items-center gap-4">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
                        <AvatarFallback><User /></AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-bold leading-none">{user.displayName || user.email}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-8">
          {matchState ? (
            <>
              {matchState.status === 'live' && (
                <LiveGame initialMatch={matchState} onFinish={finishMatch} />
              )}
              {matchState.status === 'finished' && (
                <MatchSummary match={matchState} onRestart={reset} />
              )}
            </>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
              <div className="flex justify-center">
                <TabsList className="grid w-full max-w-2xl grid-cols-3 h-14 bg-secondary/20 p-1 rounded-2xl">
                  <TabsTrigger value="match" className="rounded-xl font-bold gap-2 data-[state=active]:bg-primary">
                    <Shield className="h-4 w-4" /> Nuevo
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="rounded-xl font-bold gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                    <Users className="h-4 w-4" /> Clubes
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl font-bold gap-2 data-[state=active]:bg-secondary text-foreground">
                    <History className="h-4 w-4" /> Historial
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="match">
                <MatchSetup onStart={startMatch} />
              </TabsContent>

              <TabsContent value="teams">
                <TeamManagement />
              </TabsContent>

              <TabsContent value="history">
                <MatchHistory onSelectMatch={(m) => setMatchState(m)} />
              </TabsContent>
            </Tabs>
          )}
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-border/40 mt-12 bg-secondary/10">
          <div className="container mx-auto px-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground font-medium">
              &copy; {currentYear} SRFC - Resultados de Fútbol HN
            </p>
          </div>
        </footer>
      </div>
    </AuthGate>
  );
}
