import { todayInJerusalem } from "@/lib/dates";
import { loadDays, loadMenu, loadOrders } from "@/lib/order-data";
import { csvFileName, ordersCsv } from "@/lib/orders-csv";
import { createClient } from "@/lib/supabase/server";

// GET /settings/export: all orders as a CSV file (Excel, Hebrew). Logged-in users only;
// the file holds customer data, so it's never cached anywhere.
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return new Response("unauthorized", { status: 401 });

  let orders, days, menu;
  try {
    [orders, days, menu] = await Promise.all([loadOrders(supabase), loadDays(supabase), loadMenu(supabase)]);
  } catch (error) {
    console.error("export: load", (error as Error).message);
    return new Response("export failed", { status: 500 });
  }

  const csv = ordersCsv(
    orders,
    Object.fromEntries(days.map((d) => [d.day, d.label])),
    menu.filter((f) => f.isActive).length,
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFileName(todayInJerusalem(new Date()))}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
