import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListProducts, useCreateSale, getListProductsQueryKey, getListSalesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, DollarSign, Wallet, BadgeDollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateSaleBodyPaymentMethod } from "@workspace/api-client-react";

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

export default function Checkout() {
  const { data: products = [] } = useListProducts();
  const createSale = useCreateSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<CreateSaleBodyPaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const lower = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.sku.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower)
    );
  }, [products, search]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: "Cannot add more", description: "Not enough stock available", variant: "destructive" });
          return prev;
        }
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (product.stock <= 0) {
        toast({ title: "Out of stock", description: "This product is out of stock", variant: "destructive" });
        return prev;
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        stock: product.stock
      }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQ = item.quantity + delta;
        if (newQ > item.stock) return item;
        if (newQ <= 0) return item;
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    createSale.mutate({
      data: {
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
        paymentMethod,
        customerName: customerName || null
      }
    }, {
      onSuccess: () => {
        toast({ title: "Sale Completed", description: `Processed ${paymentMethod.toUpperCase()} payment for $${cartTotal.toFixed(2)}` });
        setCart([]);
        setCustomerName("");
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Checkout Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex h-full p-6 gap-6">
      {/* Product Selection */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search products by name, SKU, or category..." 
            className="pl-10 h-12 text-lg bg-card border-card-border"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className={`cursor-pointer hover:border-primary transition-colors ${product.stock <= 0 ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {product.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="font-bold text-lg text-primary">${product.price.toFixed(2)}</div>
                  <div className={`text-xs ${product.stock <= product.lowStockThreshold ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {product.stock} in stock
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart */}
      <Card className="w-[400px] flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Current Sale</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 p-0">
          <ScrollArea className="flex-1 px-6">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm py-12">
                Cart is empty
              </div>
            ) : (
              <div className="flex flex-col gap-4 py-2">
                {cart.map(item => (
                  <div key={item.productId} className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</div>
                      </div>
                      <div className="font-bold">${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.productId, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.productId, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <div className="flex-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.productId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Separator className="mt-2" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="p-6 bg-muted/30 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg">Total</span>
              <span className="text-3xl font-bold text-primary">${cartTotal.toFixed(2)}</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={paymentMethod === "cash" ? "default" : "outline"} 
                    className="justify-start gap-2"
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <Banknote className="h-4 w-4" /> Cash
                  </Button>
                  <Button 
                    variant={paymentMethod === "card" ? "default" : "outline"} 
                    className="justify-start gap-2"
                    onClick={() => setPaymentMethod("card")}
                  >
                    <CreditCard className="h-4 w-4" /> Card
                  </Button>
                  <Button 
                    variant={paymentMethod === "usdc" ? "default" : "outline"} 
                    className="justify-start gap-2"
                    onClick={() => setPaymentMethod("usdc")}
                  >
                    <DollarSign className="h-4 w-4" /> USDC
                  </Button>
                  <Button 
                    variant={paymentMethod === "pol" ? "default" : "outline"} 
                    className="justify-start gap-2"
                    onClick={() => setPaymentMethod("pol")}
                  >
                    <Wallet className="h-4 w-4" /> POL
                  </Button>
                  <Button 
                    variant={paymentMethod === "pduka" ? "default" : "outline"} 
                    className="col-span-2 justify-start gap-2 border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black"
                    style={paymentMethod === "pduka" ? { backgroundColor: '#FFD700', color: '#000' } : {}}
                    onClick={() => setPaymentMethod("pduka")}
                  >
                    <BadgeDollarSign className="h-4 w-4" /> PDuka Token
                  </Button>
                </div>
                {paymentMethod === "card" && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                    Present card on reader — tap, swipe, or insert to complete
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">Customer Name (Optional)</label>
                <Input 
                  placeholder="Enter name..." 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>

              <Button 
                size="lg" 
                className="w-full text-lg h-14" 
                disabled={cart.length === 0 || createSale.isPending}
                onClick={handleCheckout}
              >
                {createSale.isPending ? "Processing..." : `Process $${cartTotal.toFixed(2)}`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}