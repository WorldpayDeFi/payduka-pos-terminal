import { useState } from "react";
import { useListSales, useGetSale } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function SaleDetailsDialog({ saleId, open, onOpenChange }: { saleId: number | null, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { data: sale, isLoading } = useGetSale(saleId || 0, { query: { enabled: !!saleId } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sale Details #{saleId}</DialogTitle>
        </DialogHeader>
        
        {isLoading || !sale ? (
          <div className="py-8 text-center text-muted-foreground">Loading details...</div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">{format(new Date(sale.createdAt), "MMM d, yyyy h:mm a")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Payment Method</div>
                <Badge className="capitalize mt-1">{sale.paymentMethod}</Badge>
              </div>
            </div>

            {sale.customerName && (
              <div>
                <span className="text-sm text-muted-foreground">Customer: </span>
                <span className="font-medium">{sale.customerName}</span>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-3 border-b pb-2">Line Items</h3>
              <div className="space-y-3">
                {sale.items.map(item => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">{item.quantity} x ${item.unitPrice.toFixed(2)}</div>
                    </div>
                    <div className="font-medium">${item.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${sale.total.toFixed(2)}</span>
              </div>
              {sale.pdukaEarned > 0 && (
                <div className="flex justify-between text-sm text-[#FFD700] font-medium">
                  <span>PDuka Earned</span>
                  <span>+{sale.pdukaEarned.toFixed(2)}</span>
                </div>
              )}
            </div>

            {sale.txHash && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded break-all">
                <span className="font-medium text-foreground block mb-1">Transaction Hash:</span>
                {sale.txHash}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Sales() {
  const { data: sales = [], isLoading } = useListSales({ limit: 100 });
  const [selectedSale, setSelectedSale] = useState<number | null>(null);

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'usdc': return 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30';
      case 'pol': return 'bg-purple-500/20 text-purple-500 hover:bg-purple-500/30';
      case 'pduka': return 'bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/30';
      default: return 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'; // cash
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales History</h1>
        <p className="text-muted-foreground mt-1">Recent transactions and receipts.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map(sale => (
                <TableRow 
                  key={sale.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedSale(sale.id)}
                >
                  <TableCell>
                    <div className="font-medium">{format(new Date(sale.createdAt), "MMM d, yyyy")}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(sale.createdAt), "h:mm a")}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sale.customerName || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`capitalize ${getPaymentMethodColor(sale.paymentMethod)}`}>
                      {sale.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-bold text-primary">${sale.total.toFixed(2)}</div>
                    {sale.pdukaEarned > 0 && (
                      <div className="text-xs text-[#FFD700]">+{sale.pdukaEarned.toFixed(2)} PDuka</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No sales recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SaleDetailsDialog 
        saleId={selectedSale} 
        open={selectedSale !== null} 
        onOpenChange={(o) => !o && setSelectedSale(null)} 
      />
    </div>
  );
}