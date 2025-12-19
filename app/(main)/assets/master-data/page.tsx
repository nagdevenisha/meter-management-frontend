/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { useDebounce } from "use-debounce";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Search,
  RefreshCw,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Radio,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import AssetsService from "@/services/assets.service";

type TabType = "meters" | "groups" | "things" | "unregistered";

interface Filters {
  search: string;
  status: string;
  powerHATStatus: string;
  groupName: string;
  page: number;
  limit: number;
}

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabType>("meters");

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    powerHATStatus: "",
    groupName: "",
    page: 1,
    limit: 25,
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [meters, setMeters] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [things, setThings] = useState<any[]>([]);
  const [unregistered, setUnregistered] = useState<string[]>([]);

  const [totalMeters, setTotalMeters] = useState(0);
  const [totalThings, setTotalThings] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  const [debouncedSearch] = useDebounce(filters.search, 600);

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.powerHATStatus ||
      filters.groupName
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "meters") {
      const res = await AssetsService.getMeters({
        page: filters.page,
        limit: filters.limit,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        powerHATStatus: filters.powerHATStatus || undefined,
        groupName: filters.groupName || undefined,
      });
        setMeters(res.meters);
        console.log(res.meters);
        setTotalMeters(res.pagination.total);
      } else if (activeTab === "groups") {
        const res = await AssetsService.getThingGroups({ limit: 50 });
        setGroups(res.groups);
      } else if (activeTab === "things" && filters.groupName) {
        const res = await AssetsService.getThingsInGroup(filters.groupName, {
          page: filters.page,
          limit: filters.limit,
        });
        setThings(res.things);
        setTotalThings(res.pagination.total);
      } else if (activeTab === "unregistered" && filters.groupName) {
        const res = await AssetsService.getUnregisteredInGroup(
          filters.groupName
        );
        setUnregistered(res);
      }
    } catch (err) {
      toast.error(`Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, filters.page, filters.limit, filters.status, filters.powerHATStatus, filters.groupName, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    toast.success("Refreshed");
    fetchData();
  };

  const handleApplyFilters = () => {
    setFilters({ ...tempFilters, page: 1 });
    setDialogOpen(false);
    toast.success("Filters applied");
  };

  const handleResetFilters = () => {
    const reset = {
      search: "",
      status: "",
      powerHATStatus: "",
      groupName: "",
      page: 1,
      limit: filters.limit,
    };
    setFilters(reset);
    setTempFilters(reset);
    toast("Filters cleared");
  };

  const openDialog = () => {
    setTempFilters(filters);
    setDialogOpen(true);
  };

  // === Meters Table ===
  const meterColumns: ColumnDef<any>[] = [
    {
      accessorKey: "meterId",
      header: "Meter ID",
      cell: ({ row }) => (
        <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
          {row.original.meterId}
        </code>
      ),
    },
    {
      accessorKey: "meterType",
      header: "Type",
      cell: ({ row }) => row.original.meterType || "—",
    },
    {
      accessorKey: "assetSerialNumber",
      header: "Serial",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.assetSerialNumber || "—"}
        </span>
      ),
    },
    {
      accessorKey: "powerHATStatus",
      header: "HAT",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.powerHATStatus === "Flashed" ? "default" : "secondary"
          }
        >
          {row.original.powerHATStatus || "Unknown"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "REGISTERED" ? "default" : "destructive"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "groupName",
      header: "Group",
      cell: ({ row }) => row.original.groupName || "—",
    },
  ];

  const meterTable = useReactTable({
    data: meters,
    columns: meterColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalMeters / filters.limit),
  });

  // === Things Table ===
  const thingColumns: ColumnDef<any>[] = [
    {
      accessorKey: "thingName",
      header: "Thing Name",
      cell: ({ row }) => (
        <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
          {row.original.thingName}
        </code>
      ),
    },
    {
      accessorKey: "status",
      header: "DB Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "REGISTERED" ? "default" : "secondary"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
  ];

  const thingTable = useReactTable({
    data: things,
    columns: thingColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalThings / filters.limit),
  });

  return (
    <div className="p-4 space-y-6">
      <PageHeader
        title="Master Data"
        description="AWS IoT Things, Groups, Meters & Sync Status"
        badge={<Database className="h-5 w-5" />}
        size="sm"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ButtonGroup>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={openDialog}>
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {
                          [
                            filters.search && 1,
                            filters.status && 1,
                            filters.powerHATStatus && 1,
                            filters.groupName && 1,
                          ].filter(Boolean).length
                        }
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Filter Master Data</DialogTitle>
                    <DialogDescription>
                      Filter across meters, things, and groups.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-2">
                      <Label>Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Meter ID, Thing Name..."
                          value={tempFilters.search}
                          onChange={(e) =>
                            setTempFilters((p) => ({
                              ...p,
                              search: e.target.value,
                            }))
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Meter Status</Label>
                      <Select
                        value={tempFilters.status || "all"}
                        onValueChange={(v) =>
                          setTempFilters((p) => ({
                            ...p,
                            status: v === "all" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                              <SelectItem value="registered">Registered</SelectItem>
                              <SelectItem value="unregistered">unregistered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Power HAT</Label>
                      <Select
                        value={tempFilters.powerHATStatus || "all"}
                        onValueChange={(v) =>
                          setTempFilters((p) => ({
                            ...p,
                            powerHATStatus: v === "all" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="Flashed">Flashed</SelectItem>
                          <SelectItem value="No HAT">No HAT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>AWS Group</Label>
                      <Input
                        placeholder="e.g. armenia_meter"
                        value={tempFilters.groupName}
                        onChange={(e) =>
                          setTempFilters((p) => ({
                            ...p,
                            groupName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleApplyFilters}>Apply</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleResetFilters}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </ButtonGroup>

            <ButtonGroup>
              <Select
                value={refreshInterval ? String(refreshInterval) : "off"}
                onValueChange={(v) =>
                  setRefreshInterval(v === "off" ? null : Number(v))
                }
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Refresh: Off" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Refresh: Off</SelectItem>
                  <SelectItem value="10000">Every 10s</SelectItem>
                  <SelectItem value="30000">Every 30s</SelectItem>
                  <SelectItem value="60000">Every 1 min</SelectItem>
                  <SelectItem value="300000">Every 5 min</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="icon"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </ButtonGroup>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="meters">
            Meters{" "}
            {totalMeters > 0 && <Badge className="ml-2">{totalMeters}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="things" disabled={!filters.groupName}>
            Things{" "}
            {totalThings > 0 && <Badge className="ml-2">{totalThings}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="unregistered" disabled={!filters.groupName}>
            Unregistered
          </TabsTrigger>
        </TabsList>

        {/* === Meters Tab === */}
        <TabsContent value="meters" className="mt-6">
          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto">
              <Table className="border-separate border-spacing-0 [&_td]:border-border [&_th]:border-b [&_th]:border-border [&_tr]:border-none [&_tr:not(:last-child)_td]:border-b">
                <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
                  {meterTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="bg-background">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64">
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <Spinner className="h-8 w-8" />
                          <p className="text-muted-foreground">
                            Loading meters...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : meters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64">
                        <Empty>
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <AlertCircle className="h-12 w-12 text-muted-foreground" />
                            </EmptyMedia>
                            <EmptyTitle>No meters found</EmptyTitle>
                            <EmptyDescription>
                              {hasActiveFilters
                                ? "Try adjusting your filters"
                                : "No meters registered yet"}
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    meterTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalMeters > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Showing {(filters.page - 1) * filters.limit + 1}–
                  {Math.min(filters.page * filters.limit, totalMeters)} of{" "}
                  {totalMeters.toLocaleString()} meters
                </p>
                <div className="flex items-center gap-3">
                  <Select
                    value={String(filters.limit)}
                    onValueChange={(v) =>
                      setFilters((p) => ({ ...p, limit: Number(v), page: 1 }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} rows
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ButtonGroup>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setFilters((p) => ({ ...p, page: p.page - 1 }))
                      }
                      disabled={filters.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium p-2 pb-0 border-y">
                      Page {filters.page} of{" "}
                      {Math.ceil(totalMeters / filters.limit)}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setFilters((p) => ({ ...p, page: p.page + 1 }))
                      }
                      disabled={
                        filters.page >= Math.ceil(totalMeters / filters.limit)
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </ButtonGroup>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* === Groups Tab === */}
        <TabsContent value="groups" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-6">
                  <Spinner className="h-8 w-8 mx-auto" />
                </div>
              ))
            ) : groups.length === 0 ? (
              <div className="col-span-full">
                <Empty>
                  <EmptyTitle>No AWS Thing Groups</EmptyTitle>
                </Empty>
              </div>
            ) : (
              groups.map((g) => (
                <div
                  key={g.groupName}
                  className="border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => {
                    setFilters((p) => ({ ...p, groupName: g.groupName }));
                    setActiveTab("things");
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{g.groupName}</h3>
                  </div>
                  <code className="text-xs text-muted-foreground block">
                    {g.groupId}
                  </code>
                  <p className="text-xs text-muted-foreground mt-3">
                    Click to view things →
                  </p>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* === Things Tab === */}
        <TabsContent value="things" className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <Label>Selected Group:</Label>
            <code className="font-mono bg-muted px-3 py-1 rounded">
              {filters.groupName}
            </code>
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto">
              <Table className="border-separate border-spacing-0 [&_td]:border-border [&_th]:border-b [&_th]:border-border [&_tr]:border-none [&_tr:not(:last-child)_td]:border-b">
                <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
                  {thingTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="bg-background">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-64">
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <Spinner className="h-8 w-8" />
                          <p className="text-muted-foreground">
                            Loading things...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : things.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-64">
                        <Empty>
                          <EmptyTitle>No things in this group</EmptyTitle>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    thingTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalThings > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Showing {(filters.page - 1) * filters.limit + 1}–
                  {Math.min(filters.page * filters.limit, totalThings)} of{" "}
                  {totalThings.toLocaleString()} things
                </p>
                <div className="flex items-center gap-3">
                  <Select
                    value={String(filters.limit)}
                    onValueChange={(v) =>
                      setFilters((p) => ({ ...p, limit: Number(v), page: 1 }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} rows
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ButtonGroup>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setFilters((p) => ({ ...p, page: p.page - 1 }))
                      }
                      disabled={filters.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium p-2 pb-0 border-y">
                      Page {filters.page} of{" "}
                      {Math.ceil(totalThings / filters.limit)}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setFilters((p) => ({ ...p, page: p.page + 1 }))
                      }
                      disabled={
                        filters.page >= Math.ceil(totalThings / filters.limit)
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </ButtonGroup>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* === Unregistered Tab === */}
        <TabsContent value="unregistered" className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <Label>Selected Group:</Label>
            <code className="font-mono bg-muted px-3 py-1 rounded">
              {filters.groupName}
            </code>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : unregistered.length === 0 ? (
            <div className="text-center py-12 text-green-600">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
              <p className="text-base font-medium">All things are registered!</p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
              <div className="flex items-center gap-2 text-yellow-800 mb-4">
                <AlertTriangle className="h-5 w-5" />
                <strong>Unregistered Things ({unregistered.length})</strong>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {unregistered.map((name) => (
                  <code
                    key={name}
                    className="text-xs bg-yellow-100 px-3 py-2 rounded font-mono block truncate"
                  >
                    {name}
                  </code>
                ))}
              </div>
              <p className="text-xs text-yellow-700 mt-4">
                These exist in AWS IoT but are not linked in your database.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
