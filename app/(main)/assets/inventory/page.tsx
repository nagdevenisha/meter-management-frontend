/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Edit,
  Package,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import AssetsService from "@/services/assets.service";

// Zod Schema
const editMeterSchema = z.object({
  meterType: z.string().optional(),
  assetSerialNumber: z.string().optional(),
  powerHATStatus: z.enum(["Flashed", "No HAT", "Unknown"]).optional(),
});

type EditMeterForm = z.infer<typeof editMeterSchema>;

export default function ListMetersPage() {
  const [filters, setFilters] = useState({
    search: "",
    meterType: "",
    powerHATStatus: "",
    groupName: "",
    status: "",
    page: 1,
    limit: 25,
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<any>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  const [debouncedSearch] = useDebounce(filters.search, 600);

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.meterType ||
      filters.powerHATStatus ||
      filters.groupName ||
      filters.status
  );

  const fetchMeters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AssetsService.getMeters({
        search: debouncedSearch || undefined,
        meterType: filters.meterType || undefined,
        powerHATStatus: filters.powerHATStatus || undefined,
        groupName: filters.groupName || undefined,
        status: filters.status || undefined,
        page: filters.page,
        limit: filters.limit,
      });
      setData(res.meters);
      setTotal(res.pagination.total);
    } catch (err: any) {
      toast.error("Failed to load meters");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    debouncedSearch,
    filters.meterType,
    filters.powerHATStatus,
    filters.groupName,
    filters.status,
    filters.page,
    filters.limit,
  ]);

  useEffect(() => {
    fetchMeters();
  }, [fetchMeters]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval) {
      intervalRef.current = setInterval(fetchMeters, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, fetchMeters]);

  const handleRefresh = () => {
    setRefreshing(true);
    toast.success("Refreshed");
    fetchMeters();
  };

  const handleApplyFilters = () => {
    setFilters({ ...tempFilters, page: 1 });
    setDialogOpen(false);
    toast.success("Filters applied");
  };

  const handleResetFilters = () => {
    const reset = {
      search: "",
      meterType: "",
      powerHATStatus: "",
      groupName: "",
      status: "",
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

  // Edit Modal Form
  const form = useForm<EditMeterForm>({
    resolver: zodResolver(editMeterSchema),
    defaultValues: {
      meterType: "",
      assetSerialNumber: "",
      powerHATStatus: undefined,
    },
  });

  const openEditModal = (meter: any) => {
    setEditingMeter(meter);
    form.reset({
      meterType: meter.meterType || "",
      assetSerialNumber: meter.assetSerialNumber || "",
      powerHATStatus: meter.powerHATStatus || undefined,
    });
    setEditModalOpen(true);
  };

  const onSubmit = async (values: EditMeterForm) => {
    if (!editingMeter) return;

    try {
      await AssetsService.updateMeter(editingMeter.meterId, values);
      toast.success("Meter updated successfully");
      setEditModalOpen(false);
      fetchMeters();
    } catch (err: any) {
      toast.error(err.response?.data?.msg || "Failed to update meter");
    }
  };

  const columns: ColumnDef<any>[] = [
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
          {row.original.status || "unknown"}
        </Badge>
      ),
    },
    {
      accessorKey: "groupName",
      header: "Group",
      cell: ({ row }) => row.original.groupName || "—",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => openEditModal(row.original)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / filters.limit),
  });

  return (
    <div className="p-4 space-y-6">
      <PageHeader
        title="Meters Inventory"
        description="View and edit all registered smart meters"
        badge={<Badge variant="outline">{total.toLocaleString()} total</Badge>}
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
                            filters.meterType && 1,
                            filters.powerHATStatus && 1,
                            filters.groupName && 1,
                            filters.status && 1,
                          ].filter(Boolean).length
                        }
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Filter Meters</DialogTitle>
                    <DialogDescription>
                      Narrow down meters by ID, type, HAT status, group, or
                      registration status.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-2">
                      <Label>Search Meter ID</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g., METER123"
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
                      <Label>Meter Type</Label>
                      <Input
                        placeholder="e.g., TouchMeterWithWiFi"
                        value={tempFilters.meterType}
                        onChange={(e) =>
                          setTempFilters((p) => ({
                            ...p,
                            meterType: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Power HAT Status</Label>
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
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="Flashed">Flashed</SelectItem>
                          <SelectItem value="No HAT">No HAT</SelectItem>
                          <SelectItem value="Unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>AWS Group</Label>
                      <Input
                        placeholder="e.g., armenia_meter"
                        value={tempFilters.groupName}
                        onChange={(e) =>
                          setTempFilters((p) => ({
                            ...p,
                            groupName: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Registration Status</Label>
                      <Select
                        value={tempFilters.status ?? "all"}
                        onValueChange={(v) =>
                          setTempFilters((p) => ({
                            ...p,
                            status: v === "all" ? "" : v.toLowerCase(),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="registered">Registered</SelectItem>
                          <SelectItem value="unregistered">unregistered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div> 

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleApplyFilters}>Apply Filters</Button>
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

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto">
          <Table className="border-separate border-spacing-0 [&_td]:border-border [&_th]:border-b [&_th]:border-border [&_tr]:border-none [&_tr:not(:last-child)_td]:border-b">
            <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
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
                  <TableCell colSpan={7} className="h-64">
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <Spinner className="h-8 w-8" />
                      <p className="text-muted-foreground">Loading meters...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyTitle>No meters found</EmptyTitle>
                        <EmptyDescription>
                          {hasActiveFilters
                            ? "Try adjusting your filters"
                            : "No meters have been registered yet"}
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button onClick={handleRefresh} variant="outline">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
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

        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Showing {(filters.page - 1) * filters.limit + 1}–
              {Math.min(filters.page * filters.limit, total)} of{" "}
              {total.toLocaleString()} meters
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
                  {[10, 25, 50, 100].map((n) => (
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
                  Page {filters.page} of {Math.ceil(total / filters.limit)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setFilters((p) => ({ ...p, page: p.page + 1 }))
                  }
                  disabled={filters.page >= Math.ceil(total / filters.limit)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </ButtonGroup>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Meter:{" "}
              <code className="font-mono">{editingMeter?.meterId}</code>
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="meterType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meter Type</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., TouchMeterWithWiFi"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assetSerialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., INDIT1125IM000101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="powerHATStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Power HAT Status</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="Flashed">Flashed</SelectItem>
                          <SelectItem value="No HAT">No HAT</SelectItem>
                          <SelectItem value="Unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
