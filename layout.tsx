
'use client';

import React, { useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, Loader2, Trophy, UserPlus, Mail, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "¡Bienvenido de nuevo!",
        description: "Has iniciado sesión correctamente.",
      });
    } catch (error: any) {
      let message = "No se pudo iniciar sesión.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Credenciales incorrectas. Verifica tu correo y contraseña.";
      }
      toast({
        variant: "destructive",
        title: "Error de Acceso",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Contraseña débil",
        description: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Cuenta creada",
        description: "Ahora puedes gestionar los resultados de SRFC.",
      });
    } catch (error: any) {
      let message = "No se pudo crear la cuenta.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Este correo ya está registrado.";
      }
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="font-headline font-bold text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Cargando SRFC...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-6 bg-primary/10 rounded-[2.5rem] rotate-3 shadow-inner hover:rotate-0 transition-transform duration-500">
              <Trophy className="h-16 w-16 text-primary drop-shadow-md" />
            </div>
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tighter text-foreground">SRFC</h1>
              <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px]">Resultados de Fútbol HN</p>
            </div>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-14 bg-secondary/20 p-1 rounded-2xl mb-6">
              <TabsTrigger value="login" className="rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl font-black">Acceso</CardTitle>
                  <CardDescription>Introduce tus credenciales para continuar.</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-login">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email-login" 
                          type="email" 
                          placeholder="tu@correo.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12 rounded-xl bg-background/50"
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-login">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password-login" 
                          type="password" 
                          placeholder="••••••••" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 h-12 rounded-xl bg-background/50"
                          required 
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full h-14 rounded-2xl text-lg font-bold gap-3 shadow-xl shadow-primary/20"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                      Iniciar Sesión
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl font-black">Crear Cuenta</CardTitle>
                  <CardDescription>Únete al equipo SRFC para gestionar resultados.</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-reg">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email-reg" 
                          type="email" 
                          placeholder="tu@correo.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12 rounded-xl bg-background/50"
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-reg">Contraseña (mín. 6 car.)</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password-reg" 
                          type="password" 
                          placeholder="••••••••" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 h-12 rounded-xl bg-background/50"
                          required 
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      variant="secondary"
                      className="w-full h-14 rounded-2xl text-lg font-bold gap-3 shadow-xl"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                      Crear Cuenta
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground/60 italic">
            El acceso está restringido a personal autorizado de SRFC HN.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
