"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GuildSwitcher } from "@/components/guild-switcher";
import { UserMenu } from "@/components/user-menu";
import { Home, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Glassmorphism container with enhanced shadow */}
            <div className="relative border-t border-border/50 bg-card/80 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.4)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
                {/* Subtle gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />

                <div className="relative mx-auto flex h-16 max-w-md items-center justify-around px-4">
                    <GuildSwitcher
                        side="top"
                        trigger={
                            <button className="group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-all duration-200 hover:bg-accent/50 active:scale-95">
                                <Users className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                                <span className="text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                                    Guilds
                                </span>
                            </button>
                        }
                    />

                    <Link
                        href="/"
                        className={cn(
                            "group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-all duration-200 active:scale-95",
                            pathname === "/"
                                ? "bg-primary/10"
                                : "hover:bg-accent/50"
                        )}
                    >
                        <Home
                            className={cn(
                                "h-5 w-5 transition-colors",
                                pathname === "/"
                                    ? "text-primary"
                                    : "text-muted-foreground group-hover:text-foreground"
                            )}
                        />
                        <span
                            className={cn(
                                "text-[10px] font-medium transition-colors",
                                pathname === "/"
                                    ? "text-primary"
                                    : "text-muted-foreground group-hover:text-foreground"
                            )}
                        >
                            Home
                        </span>
                        {pathname === "/" && (
                            <div className="absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                        )}
                    </Link>

                    <UserMenu
                        side="top"
                        trigger={
                            <button className="group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-all duration-200 hover:bg-accent/50 active:scale-95">
                                <User className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                                <span className="text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                                    Profile
                                </span>
                            </button>
                        }
                    />
                </div>
            </div>
        </div>
    );
}
