"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorPageProps {
  code: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function ErrorPage({
  code,
  title,
  description,
  actionLabel = "返回首页",
  actionHref = "/",
}: ErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg rounded-3xl border p-8 text-center shadow-lg">
        <p className="text-sm font-semibold tracking-widest text-emerald-500">
          ZJU Charger
        </p>
        <h1 className="mt-4 text-5xl font-bold text-card-foreground">{code}</h1>
        <p className="mt-2 text-2xl font-semibold text-card-foreground">
          {title}
        </p>
        <p className="mt-4 text-muted-foreground">{description}</p>
        <div className="mt-8 flex justify-center">
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
