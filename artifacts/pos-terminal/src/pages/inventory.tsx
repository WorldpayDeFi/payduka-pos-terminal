import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListProducts, useUpdateProduct, useCreateProduct, useDeleteProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Inventory() {
  const { data: products = [], isLoading } = useListProducts();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "",
    price: 0,
    stock: 0,
    lowStockThreshold: 5,
    unit: "pcs"
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditStart = (product: any) => {
    setEditingId(product.id);
    setEditStock(product.stock);
  };

  const handleEditSave = (id: number) => {
    updateProduct.mutate({ id, data: { stock: editStock } }, {
      onSuccess: () => {
        toast({ title: "Stock updated" });
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Product deleted" });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate({ data: newProduct }, {
      onSuccess: () => {
        toast({ title: "Product created" });
        setIsAddOpen(false);
        setNewProduct({ name: "", sku: "", category: "", price: 0, stock: 0, lowStockThreshold: 5, unit: "pcs" });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog and stock levels.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SKU</label>
                  <Input required value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Input required value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price ($)</label>
                  <Input required type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Initial Stock</label>
                  <Input required type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Low Stock Alert At</label>
                  <Input required type="number" value={newProduct.lowStockThreshold} onChange={e => setNewProduct({...newProduct, lowStockThreshold: parseInt(e.target.value)})} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createProduct.isPending}>
                {createProduct.isPending ? "Saving..." : "Create Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search by name or SKU..." 
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">${product.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            className="w-20 h-8" 
                            value={editStock} 
                            onChange={e => setEditStock(parseInt(e.target.value))}
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleEditSave(product.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${product.stock <= 0 ? 'text-destructive' : product.stock <= product.lowStockThreshold ? 'text-orange-500' : ''}`}>
                            {product.stock}
                          </span>
                          {product.stock <= 0 ? (
                            <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
                          ) : product.stock <= product.lowStockThreshold ? (
                            <Badge variant="secondary" className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 text-[10px]">Low Stock</Badge>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditStart(product)} disabled={editingId !== null}>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}