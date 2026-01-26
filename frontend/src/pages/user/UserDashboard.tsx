import { Badge } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getReservations } from "../../api/reservation";
import { getPublicTopPageContent } from "../../api/topPageContent";
import TopPageRenderer from "../../components/TopPage/TopPageRenderer";

export default function UserDashboard() {
  const [period, setPeriod] = useState<"today" | "month">("today");

  const today = new Date().toISOString().split("T")[0];

  // 今日の予約を取得
  const { data: todayReservations } = useQuery({
    queryKey: ["reservations", "today"],
    queryFn: () =>
      getReservations({ startDate: today, endDate: today, limit: 10 }),
  });

  // ダッシュボードコンテンツを取得
  const { data: dashboardContent } = useQuery({
    queryKey: ["top-page-content"],
    queryFn: getPublicTopPageContent,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge colorScheme="yellow">承認待ち</Badge>;
      case "approved":
        return <Badge colorScheme="green">承認済み</Badge>;
      case "rejected":
        return <Badge colorScheme="red">却下</Badge>;
      case "cancelled":
        return <Badge colorScheme="gray">キャンセル</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // コンテンツをタイプ別に分類
  const announcements =
    dashboardContent?.filter((c) => c.type === "announcement") || [];
  const guides = dashboardContent?.filter((c) => c.type === "guide") || [];
  const flows = dashboardContent?.filter((c) => c.type === "flow") || [];
  const pdfs = dashboardContent?.filter((c) => c.type === "pdf") || [];
  const links = dashboardContent?.filter((c) => c.type === "link") || [];

  return (
    <TopPageRenderer
      today={today}
      period={period}
      setPeriod={setPeriod}
      announcements={announcements}
      guides={guides}
      flows={flows}
      pdfs={pdfs}
      links={links}
      todayReservations={todayReservations}
      formatDateTime={formatDateTime}
      getStatusBadge={getStatusBadge}
    />
  );
}
