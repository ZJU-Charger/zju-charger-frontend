import { ErrorPage } from "@/components/error-page";

export const metadata = {
  title: "网关超时",
};

export default function GatewayTimeoutPage() {
  return (
    <ErrorPage
      code="504"
      title="请求超时"
      description="上游服务响应过慢，刷新页面或稍后重试。"
    />
  );
}
