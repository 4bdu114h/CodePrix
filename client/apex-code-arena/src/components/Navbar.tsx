import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, LayoutDashboard, Code2, Timer, Menu, X, LogOut, Moon, Sun, Shield } from "lucide-react";
import { useState } from "react";
import { AnimatedFlag } from "@/components/RacingElements";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/problems", label: "Problems", icon: Code2 },
  { path: "/contests", label: "Contests", icon: Timer },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b-3 border-foreground bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <AnimatedFlag size={28} />
          <span className="font-display text-lg font-bold tracking-wider text-foreground">
            Code<span className="text-primary">Prix</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {user && navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="relative px-4 py-2 group">
                <span className={`font-body text-sm font-bold tracking-wide uppercase transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-1 bg-primary border border-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
          {user && isAdmin && (
            <Link to="/admin/create-contest" className="relative px-4 py-2 group">
              <span className={`font-body text-sm font-bold tracking-wide uppercase transition-colors ${location.pathname === '/admin/create-contest' ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
                ⚡ Create Contest
              </span>
              {location.pathname === '/admin/create-contest' && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute bottom-0 left-2 right-2 h-1 bg-primary border border-foreground"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="group relative px-3 py-2 flex items-center gap-2"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground group-hover:text-secondary transition-colors" />
            )}
          </button>
          {user && (
            <>
              <span className="font-body text-xs text-muted-foreground">{user.email}</span>
              <button
                onClick={handleLogout}
                className="group relative px-3 py-2 flex items-center gap-2"
                title="Logout"
              >
                <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </>
          )}
        </div>



        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-foreground">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t-2 border-foreground bg-background"
        >
          {user && navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-4 font-body text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/30 border-b-2 border-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {user && isAdmin && (
            <Link
              to="/admin/create-contest"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-4 font-body text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/30 border-b-2 border-foreground"
            >
              <Shield className="h-4 w-4" />
              Create Contest
            </Link>
          )}          <button
            onClick={() => {
              toggleTheme();
              setMobileOpen(false);
            }}
            className="w-full flex items-center gap-3 px-6 py-4 font-body text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/30 border-b-2 border-foreground"
          >
            {theme === "light" ? (
              <>
                <Moon className="h-4 w-4" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                Light Mode
              </>
            )}
          </button>          {user && (
            <button
              onClick={() => {
                handleLogout();
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-3 px-6 py-4 font-body text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-primary hover:bg-secondary/30 border-t-2 border-foreground"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          )}
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
