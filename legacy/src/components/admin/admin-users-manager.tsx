"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count: {
    reviews: number;
    favorites: number;
  };
};

export function AdminUsersManager({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`Удалить пользователя ${user.email ?? user.name ?? user.id}?`)) return;

    setPendingId(user.id);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setPendingId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      window.alert(data?.message ?? "Не удалось удалить пользователя.");
      return;
    }

    setUsers((items) => items.filter((item) => item.id !== user.id));
  }

  return (
    <LiquidGlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-card-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Пользователь</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Отзывы</th>
              <th className="px-4 py-3 font-medium">Избранное</th>
              <th className="px-4 py-3 font-medium">Действие</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-card-border/60 last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name ?? "Без имени"}</p>
                  <p className="text-xs text-muted-foreground">{user.email ?? user.id}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={user.role === "ADMIN" ? "success" : "muted"}>{user.role}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.status}</td>
                <td className="px-4 py-3 text-muted-foreground">{user._count.reviews}</td>
                <td className="px-4 py-3 text-muted-foreground">{user._count.favorites}</td>
                <td className="px-4 py-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => void deleteUser(user)} disabled={pendingId === user.id || user.role === "ADMIN"}>
                    <Trash2 className="size-4" aria-hidden />
                    Удалить
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LiquidGlassCard>
  );
}
