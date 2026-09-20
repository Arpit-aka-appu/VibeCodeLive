"use client"
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  title: string;
  className?: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const Nav_Link = ({ icon, title, href, className = "", badge }: NavLinkProps) => {
  const path = usePathname();
  const isActive = path.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex gap-2 items-center text-sm hover:bg-zinc-700 px-3 h-full rounded-sm cursor-pointer ${className} ${isActive ? "font-bold text-zinc-200" : ""}`}
    >
      {icon}
      <p>{title}</p>
      {badge !== undefined && badge > 0 && (
        <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-[10px] font-bold text-white leading-none ml-0.5">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
};

export default Nav_Link;
