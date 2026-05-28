import type { Metadata } from "next";
import { HomePageClient } from "@/components/home-page-client";

export const metadata: Metadata = {
  title: "ZJU Charger",
  description: "浙江大学充电桩实时状态与空闲查询页面",
};

export default function HomePage() {
  return <HomePageClient />;
}
