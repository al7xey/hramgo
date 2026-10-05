"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { moscowDate } from "@/features/temples/schedules";
export function TodayLink() {
  const [date, setDate] = useState("");
  useEffect(() => setDate(moscowDate()), []);
  return (
    <Button asChild variant="outline">
      <Link
        href={`/temples/?scheduleMode=date${date ? `&date=${date}` : ""}&worship=evening&timeFrom=17:00`}
      >
        Сегодня вечером
      </Link>
    </Button>
  );
}
