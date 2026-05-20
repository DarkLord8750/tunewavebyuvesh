import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Library } from 'lucide-react';
import { cn } from '../utils/cn';

export function MobileNav() {
  const { pathname } = useLocation();
  
  const links = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Library', href: '/library', icon: Library },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 glass-panel border-t border-white/5 pb-safe">
      <div className="flex items-center justify-around p-3">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300",
                isActive ? "text-tunewave-accent" : "text-white/50 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
