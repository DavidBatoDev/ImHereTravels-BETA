"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  Search, 
  Download, 
  Settings2, 
  Filter, 
  Plus, 
  MoreHorizontal,
  Clock,
  AlertCircle,
  ExternalLink,
  LayoutGrid,
  CreditCard,
  Wallet,
  Hourglass,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { PaymentDetailsDialog } from "@/components/transactions/PaymentDetailsDialog";
import { TransactionFilterDialog, FilterConfig } from "@/components/transactions/TransactionFilterDialog";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Transaction {
  id: string;
  payment: {
    amount: number;
    currency: string;
    status: string;
    checkoutSessionId: string;
    type?: string;
    installmentTerm?: string;
  };
  customer?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  booking?: {
    id: string; // Booking ID (e.g. SB-TXP...)
    documentId: string;
  };
  tour?: {
    packageName: string;
  };
  timestamps: {
    createdAt: { seconds: number; nanoseconds: number } | string;
    paidAt?: { seconds: number; nanoseconds: number } | string;
    updatedAt?: { seconds: number; nanoseconds: number } | string;
    confirmedAt?: { seconds: number; nanoseconds: number } | string;
  };
}

export default function TransactionsPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ all: 0, reservationFee: 0, installment: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  // State for actions
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter State
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${transactionToDelete.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      
      if (result.success) {
        // Remove from local state
        setData(prev => prev.filter(t => t.id !== transactionToDelete.id));
        setStats(prev => ({ ...prev, all: Math.max(0, prev.all - 1) }));
        setDeleteDialogOpen(false);
        setTransactionToDelete(null);
      } else {
        console.error("Failed to delete:", result.error);
        alert("Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Error deleting transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    succeeded: { label: "Succeeded", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    installment_paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    reserve_paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    reservation_paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    terms_selected: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    reservation_pending: { label: "Pending", color: "bg-amber-100 text-amber-800", icon: Clock },
    failed: { label: "Failed", color: "bg-rose-100 text-rose-800", icon: AlertCircle },
    pending: { label: "Pending", color: "bg-amber-100 text-amber-800", icon: Clock },
    installment_pending: { label: "Pending", color: "bg-amber-100 text-amber-800", icon: Clock },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: AlertCircle },
  };

  const getStatusBadge = (status: string) => {
    const config = statusMap[status] || statusMap["pending"];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border-0 flex items-center gap-1 w-fit rounded-md px-2 py-0.5`}>
        {config.label} <Icon className="h-3 w-3" />
      </Badge>
    );
  };

  const getTypeLabel = (t: Transaction) => {
    if (t.payment.type === 'reservationFee') {
      return "Reservation Fee";
    }
    if (t.payment.type === 'installment' && t.payment.installmentTerm) {
      if (t.payment.installmentTerm === 'full_payment') return "Full Payment";
      return `${t.payment.installmentTerm.toUpperCase()} - Installment`;
    }
    return t.payment.type || "Payment";
  };

  const getCurrencySymbol = (currency: string) => {
    const map: Record<string, string> = {
      gbp: "£",
      usd: "$",
      eur: "€",
      php: "₱",
    };
    return map[currency.toLowerCase()] || currency.toUpperCase();
  };

  const getDate = (t: Transaction) => {
    return t.timestamps.updatedAt || t.timestamps.confirmedAt || t.timestamps.createdAt;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    
    // Handle Firestore timestamp object
    if (timestamp.seconds) {
      return format(new Date(timestamp.seconds * 1000), "MMM dd");
    }
    
    // Handle string ISO date
    if (typeof timestamp === "string") {
      return format(new Date(timestamp), "MMM dd");
    }
    
    return "—";
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const filteredData = data.filter(t => {
    // Text Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        t.customer?.email?.toLowerCase().includes(q) ||
        t.payment.amount.toString().includes(q) || 
        t.payment.currency.toLowerCase().includes(q) ||
        t.tour?.packageName?.toLowerCase().includes(q) ||
        t.payment.installmentTerm?.toLowerCase().includes(q);
      
      if (!match) return false;
    }

    // Tab Filter
    let tabMatch = true;
    if (activeTab === "Reservation Fee") {
      tabMatch = t.payment.type === "reservationFee";
    } else if (activeTab === "Installment") {
      tabMatch = t.payment.type === "installment";
    } else if (activeTab === "Pending") {
      tabMatch = ["pending", "reserve_pending", "reservation_pending", "installment_pending"].includes(t.payment.status);
    }

    if (!tabMatch) return false;

    // Advanced Filters
    if (activeFilters.length > 0) {
      const filterMatch = activeFilters.every(filter => {
        let value = getNestedValue(t, filter.field);
        
        // Handle Dates
        if (filter.field.includes('timestamps')) {
             if (value && typeof value === 'object' && 'seconds' in value) {
                 value = new Date(value.seconds * 1000).getTime();
             } else if (typeof value === 'string') {
                 value = new Date(value).getTime();
             }
             
             // Convert filter value to milliseconds
             const filterTime = filter.value ? new Date(filter.value).getTime() : 0;
             const filterTime2 = filter.value2 ? new Date(filter.value2).getTime() : 0;

             switch (filter.operator) {
                case 'eq': return new Date(value).toDateString() === new Date(filterTime).toDateString();
                case 'neq': return new Date(value).toDateString() !== new Date(filterTime).toDateString();
                case 'gt': return value > filterTime;
                case 'gte': return value >= filterTime;
                case 'lt': return value < filterTime;
                case 'lte': return value <= filterTime;
                case 'between': return value >= filterTime && value <= filterTime2;
                default: return true;
             }
        }

        const filterValue = filter.value;
        const filterValue2 = filter.value2;

        switch (filter.operator) {
            case 'eq': return String(value).toLowerCase() === String(filterValue).toLowerCase();
            case 'neq': return String(value).toLowerCase() !== String(filterValue).toLowerCase();
            case 'contains': return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'gt': return Number(value) > Number(filterValue);
            case 'gte': return Number(value) >= Number(filterValue);
            case 'lt': return Number(value) < Number(filterValue);
            case 'lte': return Number(value) <= Number(filterValue);
            case 'between': return Number(value) >= Number(filterValue) && Number(value) <= Number(filterValue2);
            default: return true;
        }
      });
      if (!filterMatch) return false;
    }

    return true; 
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-hk-grotesk">Transactions</h1>
            <p className="text-muted-foreground">
              View all Reservation and Installment transactions.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
               <Card key={i} className="border-border">
                 <CardContent className="p-5 flex justify-between items-start">
                   <div className="space-y-2">
                     <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-8 w-16" />
                   </div>
                   <Skeleton className="h-12 w-12 rounded-xl" />
                 </CardContent>
               </Card>
             ))
          ) : (
            [
             { 
               label: "All Transactions", 
               value: stats.all, 
               active: activeTab === "All", 
               onClick: () => setActiveTab("All"),
               icon: LayoutGrid,
               bgColor: "bg-blue-100"
             },
             { 
               label: "Reservation Fee", 
               value: stats.reservationFee, 
               active: activeTab === "Reservation Fee", 
               onClick: () => setActiveTab("Reservation Fee"),
               icon: CreditCard,
               bgColor: "bg-violet-100"
             },
             { 
               label: "Installment", 
               value: stats.installment, 
               active: activeTab === "Installment", 
               onClick: () => setActiveTab("Installment"),
               icon: Wallet,
               bgColor: "bg-emerald-100"
             },
             { 
               label: "Pending", 
               value: stats.pending, 
               active: activeTab === "Pending", 
               onClick: () => setActiveTab("Pending"),
               icon: Hourglass,
               bgColor: "bg-amber-100"
             },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card 
                  key={stat.label} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md border-border overflow-hidden relative ${
                    stat.active ? "ring-2 ring-primary ring-offset-1" : "bg-card"
                  }`}
                  onClick={stat.onClick}
                >
                  <CardContent className="p-5 flex justify-between items-start">
                    <div className="space-y-2 z-10">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      <div className="text-3xl font-bold font-hk-grotesk text-foreground">
                        {stat.value}
                      </div>
                    </div>
                    <div className={`p-4 rounded-full rounded-br-none ${stat.bgColor}`}>
                      <Icon className="h-6 w-6 text-black" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Filters Toolbar */}
        <div className="flex items-center gap-2">
           <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
             <Input 
               placeholder="Search..." 
               className="pl-9 bg-white" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           
           <div className="flex items-center gap-2 ml-auto">
             <Button 
                variant="outline" 
                className={`bg-white gap-2 text-sm font-normal text-gray-600 ${activeFilters.length > 0 ? 'border-primary text-primary bg-primary/5' : ''}`}
                onClick={() => setFilterDialogOpen(true)}
             >
               <Filter className="h-3 w-3" /> 
               Filters
               {activeFilters.length > 0 && (
                   <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-primary/10 text-primary hover:bg-primary/20">{activeFilters.length}</Badge>
               )}
             </Button>
           </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pb-2">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="pl-6">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tour</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="min-w-[180px]">Booking ID</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-1 font-medium font-hk-grotesk text-foreground">
                          <span className="text-muted-foreground">{getCurrencySymbol(t.payment.currency || 'GBP')}</span>
                          <span>{t.payment.amount !== undefined ? t.payment.amount.toFixed(2) : '—'}</span>
                          <span className="text-xs text-muted-foreground uppercase ml-1">{t.payment.currency || 'GBP'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(t.payment.status)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap">
                          {getTypeLabel(t)}
                        </span>
                      </TableCell>
                      <TableCell>
                         <span className="text-sm text-foreground whitespace-nowrap">
                           {t.tour?.packageName || '—'}
                         </span>
                      </TableCell>
                      <TableCell>
                         <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer hover:underline transition-colors whitespace-nowrap">
                           {t.customer?.email || '—'}
                         </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                         {formatDate(getDate(t))}
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                             {t.booking?.id || '—'}
                           </span>
                           {t.booking?.documentId && (
                             <Link 
                               href={`/bookings?tab=bookings&bookingId=${t.booking.documentId}`}
                               className="text-muted-foreground hover:text-primary transition-colors"
                               title="View Booking"
                             >
                               <ExternalLink className="h-4 w-4" />
                             </Link>
                           )}
                         </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedTransaction(t);
                              setViewDialogOpen(true);
                            }}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => {
                                setTransactionToDelete(t);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              Delete record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between text-sm text-gray-500">
             <div>
               Viewing 1-{filteredData.length} of {data.length} items
             </div>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
             </div>
          </div>
        </div>

      </div>

      {/* View Details Dialog */}
      <PaymentDetailsDialog 
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        transaction={selectedTransaction}
      />

      {/* Filter Dialog */}
      <TransactionFilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        onApplyFilters={setActiveFilters}
        activeFilters={activeFilters}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction record for 
              <span className="font-medium text-foreground"> {transactionToDelete?.id}</span>.
            </AlertDialogDescription>
            {transactionToDelete && (
               <div className="mt-2 text-sm bg-muted p-2 rounded">
                  <p><strong>Amount:</strong> {getCurrencySymbol(transactionToDelete.payment.currency)}{transactionToDelete.payment.amount}</p>
                  <p><strong>Email:</strong> {transactionToDelete.customer?.email}</p>
               </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
