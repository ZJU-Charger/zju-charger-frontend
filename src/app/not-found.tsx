import { ErrorPage } from "@/components/error-page";

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      title="页面不存在"
      description="你访问的页面已经被移动或不存在，返回首页继续探索充电站点。"
    />
  );
}
