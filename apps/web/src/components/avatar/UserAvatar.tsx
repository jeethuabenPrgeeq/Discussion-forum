"use client";

import { useEffect, useState } from "react";
import { readSessionUser, type SessionUser } from "@/features/auth/lib/session";
import styles from "./UserAvatar.module.css";

interface UserAvatarProps {
  size?: number;
  className?: string;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export default function UserAvatar({ size = 48, className }: UserAvatarProps) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(readSessionUser());
  }, []);

  const initials = user ? initialsOf(user.name) : "";

  return (
    <span
      className={`${styles.avatar} ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      role="img"
      aria-label={user ? user.name : "User"}
      data-role={user?.role}
    >
      {initials}
    </span>
  );
}