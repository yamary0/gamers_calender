"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GuildSwitcher } from "@/components/guild-switcher";
import { UserMenu } from "@/components/user-menu";
import { Gamepad2, Home, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a2341] bg-[#1f273f]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1f273f]/80 md:hidden">
            <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
                <GuildSwitcher
                    side="top"
                    trigger={
                        <div className="flex flex-col items-center gap-1 p-2 text-muted-foreground transition hover:text-foreground">
                            <Users className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Guilds</span>
                        </div>
                    }
                />

                <Link
                    href="/"
                    className={cn(
                        "flex flex-col items-center gap-1 p-2 transition",
                        pathname === "/"
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Home className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <UserMenu
                    side="top"
                    trigger={
                        <div className="flex flex-col items-center gap-1 p-2 text-muted-foreground transition hover:text-foreground">
                            <User className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Profile</span>
                        </div>
                    }
                />
            </div>
        </div>
    );
}
