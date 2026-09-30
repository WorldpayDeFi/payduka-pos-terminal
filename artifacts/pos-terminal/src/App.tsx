import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Checkout from "@/pages/checkout";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Sales from "@/pages/sales";
import AI from "@/pages/ai";
import LoginPage from "@/pages/login";

const queryClient = new QueryClient();

type Cashier = {
  id: string;
  name: string;
  role: string;
  pin_hash: string;
  color: string;
};

function PowerSyncInit() {
  useEffect(() => {
    import("@/lib/powersync/db").then(({ initPowerSync }) => {
      initPowerSync().catch(console.error);
    });
  }, []);
  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Checkout} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/sales" component={Sales} />
        <Route path="/ai" component={AI} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [cashier, setCashier] = useState<Cashier | null>(null);

  if (!cashier) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginPage onLogin={(c) => setCashier(c)} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <PowerSyncInit />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
