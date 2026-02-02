/**
 * ARQUIVO: landinpagecalculadora/src/App.tsx
 */

// Importando do alias @ (que aponta para frontend-app/src no nosso vite.config.ts)
// Adicionamos .tsx para garantir que o Rollup não se perca no build
import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Componentes de Feedback Visual (Notificações) */}
      <Toaster />
      <Sonner position="top-right" closeButton />
      
      <BrowserRouter>
        <Routes>
          {/* Rota da Landing Page (Marketing/Conversão) */}
          <Route path="/" element={<Index />} />

          {/* Rota da Calculadora (Aplicação Real) 
              Neste momento, você pode apontar para o Index ou criar uma rota específica
          */}
          <Route path="/calculadora" element={<Index />} /> 
          
          {/* Exemplo de rota protegida futura:
              <Route path="/dashboard" element={<CalculatorDashboard />} /> 
          */}

          {/* Redirecionamentos e Catch-all */}
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;