import React from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, LayoutDashboard, Package, Receipt, MessageSquareCode } from "lucide-react";
import { SyncStatus } from "@/components/SyncStatus";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Checkout", icon: ShoppingCart },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/sales", label: "Sales", icon: Receipt },
    { href: "/ai", label: "AI Agent", icon: MessageSquareCode },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 flex flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-4 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="PayDuka" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary leading-none">PayDuka</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Terminal</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-[0_0_10px_rgba(0,255,136,0.3)]" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border flex flex-col gap-2">
          <SyncStatus />
          <p className="text-xs text-muted-foreground">Terminal v1.0.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}