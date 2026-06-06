"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Fuse from "fuse.js";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Filter, Edit, Archive, Trash2, MoreHorizontal, RefreshCw,
  X, Users, Plane, Link2, ExternalLink, Instagram,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResidentHost } from "@/types/resident-hosts";
import { archiveResidentHost, deleteResidentHost } from "@/services/resident-hosts-service";

const WWW_BASE = "https://www.imheretravels.com";
const resolveImg = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${WWW_BASE}${url}`;
  return url;
};

export default function ResidentHostsList() {
  const router = useRouter();
  const { toast } = useToast();

  const [allHosts, setAllHosts] = useState<ResidentHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hostToDelete, setHostToDelete] = useState<ResidentHost | null>(null);

  const nameCollator = useMemo(
    () => new Intl.Collator(undefined, { sensitivity: "base" }),
    [],
  );

  const fuse = useMemo(() => {
    if (allHosts.length === 0) return null;
    return new Fuse(allHosts, {
      keys: [
        { name: "displayName", weight: 0.5 },
        { name: "pageTitle", weight: 0.3 },
        { name: "slug", weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [allHosts]);

  const filteredHosts = useMemo(() => {
    let results = allHosts;
    if (fuse && searchTerm) {
      results = fuse.search(searchTerm).map((r) => r.item);
    }
    if (statusFilter !== "all") {
      results = results.filter((h) => h.status === statusFilter);
    }
    return [...results].sort((a, b) =>
      nameCollator.compare((a?.displayName || "").trim(), (b?.displayName || "").trim()),
    );
  }, [fuse, searchTerm, statusFilter, allHosts, nameCollator]);

  const loadHosts = () => {
    try {
      setLoading(true);
      const q = query(collection(db, "residentHost"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as unknown as ResidentHost[];
          setAllHosts(data);
          setLoading(false);
        },
        (error) => {
          console.error("Error loading resident hosts:", error);
          toast({ title: "Error", description: "Failed to load resident hosts.", variant: "destructive" });
          setLoading(false);
        },
      );
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up resident hosts listener:", error);
      setLoading(false);
      return () => {};
    }
  };

  useEffect(() => {
    const unsub = loadHosts();
    return () => unsub && unsub();
  }, []);

  const openCreateForm = () => router.push("/resident-hosts/new");
  const openEditForm = (host: ResidentHost) => router.push(`/resident-hosts/${host.id}/edit`);

  const handleArchive = async (host: ResidentHost) => {
    try {
      await archiveResidentHost(host.id);
      toast({ title: "Success", description: "Resident host archived." });
    } catch {
      toast({ title: "Error", description: "Failed to archive resident host.", variant: "destructive" });
    }
  };

  const confirmDelete = (host: ResidentHost) => {
    setHostToDelete(host);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!hostToDelete) return;
    try {
      await deleteResidentHost(hostToDelete.id);
      toast({ title: "Success", description: "Resident host deleted." });
      setIsDeleteDialogOpen(false);
      setHostToDelete(null);
    } catch {
      toast({ title: "Error", description: "Failed to delete resident host.", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-spring-green/20 text-spring-green border border-spring-green/30";
      case "draft":
        return "bg-sunglow-yellow/20 text-vivid-orange border border-sunglow-yellow/30";
      case "archived":
        return "bg-grey/20 text-grey border border-grey/30";
      default:
        return "bg-grey/20 text-grey border border-grey/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-crimson-red/30 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-crimson-red border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Loading Resident Hosts…</p>
            <p className="text-sm text-muted-foreground mt-2">Fetching your hosts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats + Add */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Total Hosts</p>
                <p className="text-3xl font-bold text-foreground">{allHosts.length}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {allHosts.filter((h) => h.status === "active").length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-spring-green"></div>
                      <p className="text-xs text-muted-foreground">
                        Active: <span className="text-spring-green font-bold">{allHosts.filter((h) => h.status === "active").length}</span>
                      </p>
                    </div>
                  )}
                  {allHosts.filter((h) => h.status === "draft").length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-vivid-orange"></div>
                      <p className="text-xs text-muted-foreground">
                        Draft: <span className="text-vivid-orange font-bold">{allHosts.filter((h) => h.status === "draft").length}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-royal-purple/20 to-royal-purple/10 rounded-full rounded-br-none">
                <Users className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Attached Tours</p>
                <p className="text-2xl font-bold text-vivid-orange">
                  {allHosts.reduce((sum, h) => sum + (h.attachedTourIds?.length ?? 0), 0)}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-vivid-orange"></div>
                  <p className="text-xs text-muted-foreground">Across all hosts</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-vivid-orange/20 to-vivid-orange/10 rounded-full rounded-br-none">
                <Plane className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center">
          <Button
            onClick={openCreateForm}
            className="group h-20 w-20 rounded-full rounded-br-none bg-crimson-red hover:bg-royal-purple text-white transition-all duration-300 hover:scale-105 shadow-lg relative"
            title="Add New Host"
          >
            <Plus className="h-10 w-10 absolute group-hover:opacity-0 group-hover:scale-0 transition-all duration-300" />
            <span className="text-[9px] font-medium opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 whitespace-nowrap font-hk-grotesk">
              ADD HOST
            </span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-royal-purple/20 dark:border-border shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royal-purple/60 h-4 w-4" />
                <Input
                  placeholder="Search hosts…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20">
                <Filter className="mr-2 h-4 w-4 text-royal-purple" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={loadHosts}
              disabled={loading}
              className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hosts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHosts.map((host) => {
          const cardImage = host.heroImages?.[0] || host.heroImage || host.profileImage;
          return (
            <Card
              key={host.id}
              className="hover:shadow-lg transition-all duration-200 overflow-hidden border border-royal-purple/20 dark:border-border shadow hover:border-royal-purple/40 dark:hover:border-border flex flex-col h-full"
            >
              {/* Hero */}
              <div className="relative w-full h-40 bg-muted">
                {cardImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveImg(cardImage)} alt={host.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/50">
                    <Users className="h-8 w-8 text-royal-purple/60" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge className={getStatusColor(host.status)}>
                    {host.status.charAt(0).toUpperCase() + host.status.slice(1)}
                  </Badge>
                </div>
                {/* Profile bubble */}
                {host.profileImage && (
                  <div className="absolute -bottom-6 left-4 size-12 overflow-hidden rounded-full ring-4 ring-card-surface bg-light-grey">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImg(host.profileImage)} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <CardHeader className={`pb-3 ${host.profileImage ? "pt-8" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-1 text-foreground truncate">{host.pageTitle || host.displayName}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">/{host.slug}</span>
                      {host.instagram && (
                        <span className="flex items-center gap-1 text-royal-purple">
                          <Instagram className="h-3.5 w-3.5" /> {host.instagram}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-royal-purple hover:bg-royal-purple/10 hover:text-royal-purple">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditForm(host)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`${WWW_BASE}/resident-hosts/${host.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on site
                        </a>
                      </DropdownMenuItem>
                      {host.status !== "archived" && (
                        <DropdownMenuItem onClick={() => handleArchive(host)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => confirmDelete(host)} className="text-crimson-red focus:text-crimson-red">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="line-clamp-2 text-muted-foreground">
                  {host.intro?.[0] ?? ""}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 flex-1 flex flex-col">
                <div className="flex items-center gap-4 text-sm flex-1">
                  <div className="flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-royal-purple" />
                    <span className="text-foreground">{host.upcomingTrips?.length ?? 0}</span>
                    <span className="text-muted-foreground">trips</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link2 className="h-4 w-4 text-royal-purple" />
                    <span className="text-foreground">{host.attachedTourIds?.length ?? 0}</span>
                    <span className="text-muted-foreground">attached</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditForm(host)}
                    className="flex-1 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredHosts.length === 0 && !loading && (
        <Card className="border border-royal-purple/20 dark:border-border shadow">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4 border border-royal-purple/20 dark:border-border">
              <Users className="h-12 w-12 text-royal-purple/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No resident hosts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first resident host"}
            </p>
            <Button onClick={openCreateForm} className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200">
              <Plus className="mr-2 h-4 w-4" />
              Add New Host
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border border-royal-purple/20 dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the resident host
              &quot;{hostToDelete?.displayName}&quot; and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-crimson-red hover:bg-crimson-red/90 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
