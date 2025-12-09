"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
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
  const { language } = useLanguage();
  return (
    <Select value={providerId} onValueChange={onChange}>
      <SelectTrigger className="w-[130px]">
        <SelectValue
          placeholder={language === "en" ? "All providers" : "全部服务商"}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          {language === "en" ? "All" : "全部"}
        </SelectItem>
        {providers.map((provider) => (
          <SelectItem key={provider.id} value={provider.id}>
            {provider.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
