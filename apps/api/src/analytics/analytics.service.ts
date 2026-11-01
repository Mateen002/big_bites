import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_COST_RATIO = 0.58; // when costPkr missing

/** Local calendar day YYYY-MM-DD (avoids UTC off-by-one in PK). */
function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private cache = new Map<number, { data: any; expiresAt: number }>();
  private readonly TTL_MS = 60_000;

  clearCache() {
    this.cache.clear();
  }

  async overview(days = 30) {
    const hit = this.cache.get(days);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data;
    }
    const to = new Date();
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));

    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);

    const [orders, prevOrders, catalog, customers, zones, categoryCount] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: {
          items: true,
          deliveryZone: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: prevFrom, lt: from } },
        select: {
          status: true,
          totalPkr: true,
          subtotalPkr: true,
          discountPkr: true,
          deliveryFeePkr: true,
        },
      }),
      this.prisma.product.findMany({
        select: { id: true, name: true, costPkr: true, pricePkr: true, isActive: true },
      }),
      this.prisma.customer.count(),
      this.prisma.deliveryZone.count({ where: { isActive: true } }),
      this.prisma.category.count({ where: { isActive: true } }),
    ]);

    const costByProduct = new Map(
      catalog.map((p) => [
        p.id,
        p.costPkr ?? Math.round(p.pricePkr * DEFAULT_COST_RATIO),
      ]),
    );

    const active = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const cancelled = orders.filter((o) => o.status === OrderStatus.CANCELLED);
    const prevActive = prevOrders.filter((o) => o.status !== OrderStatus.CANCELLED);

    const sum = <T>(arr: T[], fn: (x: T) => number) =>
      arr.reduce((s, x) => s + fn(x), 0);

    const merchandise = sum(active, (o) => o.subtotalPkr);
    const discounts = sum(active, (o) => o.discountPkr);
    const deliveryFees = sum(active, (o) => o.deliveryFeePkr);
    const revenue = sum(active, (o) => o.totalPkr);
    const netMerchandise = merchandise - discounts;

    let cogs = 0;
    const productAgg = new Map<
      string,
      { name: string; qty: number; revenue: number; cogs: number }
    >();
    const fulfillmentAgg = {
      HOT_NOW: { items: 0, revenue: 0, orders: new Set<string>() },
      SCHEDULED: { items: 0, revenue: 0, orders: new Set<string>() },
    };
    const paymentAgg = new Map<string, { count: number; revenue: number }>();
    const zoneAgg = new Map<string, { count: number; revenue: number }>();
    const statusAgg = new Map<string, { count: number; revenue: number }>();

    for (const o of orders) {
      const st = statusAgg.get(o.status) || { count: 0, revenue: 0 };
      st.count += 1;
      if (o.status !== OrderStatus.CANCELLED) st.revenue += o.totalPkr;
      statusAgg.set(o.status, st);
    }

    for (const o of active) {
      const pay = paymentAgg.get(o.paymentMethod) || { count: 0, revenue: 0 };
      pay.count += 1;
      pay.revenue += o.totalPkr;
      paymentAgg.set(o.paymentMethod, pay);

      const zoneName = o.deliveryZone?.name || 'Unknown';
      const z = zoneAgg.get(zoneName) || { count: 0, revenue: 0 };
      z.count += 1;
      z.revenue += o.totalPkr;
      zoneAgg.set(zoneName, z);

      for (const item of o.items) {
        const unitCost =
          costByProduct.get(item.productId) ??
          Math.round(item.unitPricePkr * DEFAULT_COST_RATIO);
        const lineCogs = unitCost * item.quantity;
        cogs += lineCogs;

        const key = item.productId;
        const agg = productAgg.get(key) || {
          name: item.productName,
          qty: 0,
          revenue: 0,
          cogs: 0,
        };
        agg.qty += item.quantity;
        agg.revenue += item.lineTotalPkr;
        agg.cogs += lineCogs;
        productAgg.set(key, agg);

        const ft = item.fulfillmentType as 'HOT_NOW' | 'SCHEDULED';
        fulfillmentAgg[ft].items += item.quantity;
        fulfillmentAgg[ft].revenue += item.lineTotalPkr;
        fulfillmentAgg[ft].orders.add(o.id);
      }
    }

    const grossProfit = netMerchandise - cogs;
    const marginPct = netMerchandise > 0 ? (grossProfit / netMerchandise) * 100 : 0;

    const prevRevenue = sum(prevActive, (o) => o.totalPkr);
    const prevMerchandise = sum(prevActive, (o) => o.subtotalPkr - o.discountPkr);
    const revenueChangePct =
      prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : revenue > 0 ? 100 : 0;
    const ordersChangePct =
      prevActive.length > 0
        ? ((active.length - prevActive.length) / prevActive.length) * 100
        : active.length > 0
          ? 100
          : 0;

    // Daily series
    const byDay = new Map<string, { revenue: number; orders: number; profit: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      byDay.set(dayKey(d), { revenue: 0, orders: 0, profit: 0 });
    }

    for (const o of active) {
      const key = dayKey(o.createdAt);
      const bucket = byDay.get(key);
      if (!bucket) continue;
      bucket.revenue += o.totalPkr;
      bucket.orders += 1;
      let orderCogs = 0;
      for (const item of o.items) {
        const unitCost =
          costByProduct.get(item.productId) ??
          Math.round(item.unitPricePkr * DEFAULT_COST_RATIO);
        orderCogs += unitCost * item.quantity;
      }
      bucket.profit += o.subtotalPkr - o.discountPkr - orderCogs;
    }

    const revenueByDay = [...byDay.entries()].map(([date, v]) => ({
      date,
      ...v,
    }));

    const topProducts = [...productAgg.values()]
      .map((p) => ({
        ...p,
        profit: p.revenue - p.cogs,
        marginPct: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const productCount = catalog.filter((p) => p.isActive).length;

    const result = {
      range: { from: from.toISOString(), to: to.toISOString(), days },
      catalog: {
        products: productCount,
        categories: categoryCount,
        zones,
        customers,
        productsMissingCost: catalog.filter((p) => p.isActive && p.costPkr == null).length,
      },
      kpis: {
        revenuePkr: revenue,
        merchandisePkr: merchandise,
        discountsPkr: discounts,
        netMerchandisePkr: netMerchandise,
        deliveryFeesPkr: deliveryFees,
        cogsPkr: cogs,
        grossProfitPkr: grossProfit,
        marginPct: Math.round(marginPct * 10) / 10,
        ordersCount: active.length,
        cancelledCount: cancelled.length,
        deliveredCount: orders.filter((o) => o.status === OrderStatus.DELIVERED).length,
        aovPkr: active.length ? Math.round(revenue / active.length) : 0,
        revenueChangePct: Math.round(revenueChangePct * 10) / 10,
        ordersChangePct: Math.round(ordersChangePct * 10) / 10,
        prevRevenuePkr: prevRevenue,
        prevMerchandisePkr: prevMerchandise,
      },
      revenueByDay,
      byStatus: [...statusAgg.entries()].map(([status, v]) => ({ status, ...v })),
      byFulfillment: (['HOT_NOW', 'SCHEDULED'] as const).map((type) => ({
        type,
        items: fulfillmentAgg[type].items,
        revenue: fulfillmentAgg[type].revenue,
        orders: fulfillmentAgg[type].orders.size,
      })),
      byPayment: [...paymentAgg.entries()].map(([method, v]) => ({ method, ...v })),
      byZone: [...zoneAgg.entries()]
        .map(([zone, v]) => ({ zone, ...v }))
        .sort((a, b) => b.revenue - a.revenue),
      topProducts,
      recentOrders: orders.slice(0, 8).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        customerName: o.customerName,
        totalPkr: o.totalPkr,
        paymentMethod: o.paymentMethod,
        zone: o.deliveryZone?.name,
        createdAt: o.createdAt,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      })),
    };

    this.cache.set(days, { data: result, expiresAt: Date.now() + this.TTL_MS });
    return result;
  }
}
