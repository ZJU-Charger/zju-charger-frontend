import { ErrorPage } from "@/components/error-page";

export const metadata = {
  title: "服务暂时不可用",
};

export default function ServiceUnavailablePage() {
  return (
    <ErrorPage
      code="503"
      title="服务暂时不可用"
      description="服务器正在维护或暂时超载，请稍后再试。"
    />
  );
}
