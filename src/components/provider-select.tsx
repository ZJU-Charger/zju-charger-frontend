"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderInfo } from "@/types/station";

interface ProviderSelectProps {
  providerId: string;
  providers: ProviderInfo[];
  onChange: (id: string) => void;
}

export function ProviderSelect({
  providerId,
  providers,
  onChange,
}: ProviderSelectProps) {
  return (
    <Select value={providerId} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="全部服务商" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部</SelectItem>
        {providers.map((provider) => (
          <SelectItem key={provider.id} value={provider.id}>
            {provider.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
