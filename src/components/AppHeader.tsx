import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, role, signOut } = useAuth();

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    gestor: "Gestor",
    leitura: "Leitura",
  };

  return (
    <header className="h-14 flex items-center justify-between border-b px-4 bg-card">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold hidden sm:block">Gestão de Equipe</h1>
      </div>
      <div className="flex items-center gap-3">
        {role && (
          <Badge variant="secondary">{roleLabels[role] || role}</Badge>
        )}
        <span className="text-sm text-muted-foreground hidden md:block">
          {user?.email}
        </span>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
