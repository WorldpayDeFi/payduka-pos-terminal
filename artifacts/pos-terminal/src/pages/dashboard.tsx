import { useGetDashboardSummary, useGetDailySales, useGetMonthlyComparison, useGetTopProducts, useGetStockAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: dailySales = [], isLoading: isLoadingSales } = useGetDailySales();
  const { data: topProducts = [] } = useGetTopProducts();
  const { data: stockAlerts = [] } = useGetStockAlerts();

  if (isLoadingSummary) {
    return <div className="p-8 space-y-4"><Skeleton className="h-[200px] w-full" /></div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time pulse of your business.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary?.todayRevenue.toFixed(2) || "0.00"}</div>
            <div className="flex items-center text-xs mt-1">
              {(summary?.revenueChangePercent || 0) >= 0 ? (
                <span className="text-primary flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" />{summary?.revenueChangePercent.toFixed(1)}%</span>
              ) : (
                <span className="text-destructive flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" />{Math.abs(summary?.revenueChangePercent || 0).toFixed(1)}%</span>
              )}
              <span className="text-muted-foreground ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sales Count</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.todaySalesCount || 0}</div>
            <div className="flex items-center text-xs mt-1">
              {(summary?.salesCountChangePercent || 0) >= 0 ? (
                <span className="text-primary flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" />{summary?.salesCountChangePercent.toFixed(1)}%</span>
              ) : (
                <span className="text-destructive flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" />{Math.abs(summary?.salesCountChangePercent || 0).toFixed(1)}%</span>
              )}
              <span className="text-muted-foreground ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PDuka Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#FFD700]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#FFD700]">{summary?.todayPdukaEarned.toFixed(2) || "0.00"}</div>
            <div className="text-xs text-muted-foreground mt-1">Total rewards today</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.outOfStockCount || 0} <span className="text-lg text-muted-foreground font-normal">out</span></div>
            <div className="text-xs text-muted-foreground mt-1">{summary?.lowStockCount || 0} items running low</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                    formatter={(val: number) => [`$${val.toFixed(2)}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div key={product.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium line-clamp-1">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.totalQuantity} sold</div>
                    </div>
                  </div>
                  <div className="font-bold text-primary">${product.totalRevenue.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {stockAlerts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Requires Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{alert.name}</div>
                    <div className="text-sm text-muted-foreground">SKU: {alert.sku}</div>
                  </div>
                  <Badge variant={alert.status === 'out_of_stock' ? 'destructive' : 'secondary'} className={alert.status === 'low' ? 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30' : ''}>
                    {alert.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}