
'use client';

import React, { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // Re-throwing the error will trigger the Next.js error overlay in development
      // which is exactly what we want for agentive debugging.
      toast({
        variant: "destructive",
        title: "Error de Permisos",
        description: "No tienes permiso para realizar esta acción. Verifica las reglas de seguridad.",
      });
      throw error;
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return <>{children}</>;
}
