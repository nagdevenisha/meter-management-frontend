/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  CheckCircle2,
  AlertCircle,
  Edit2,
  Check,
  XCircle,
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
import { toast } from "sonner";

import HouseholdService, {
  HouseholdFilters,
  EnrichedHousehold,
} from "@/services/household.service";

export default function ListHouseholdsPage() {
  const [filters, setFilters] = useState<HouseholdFilters>({
    search: "",
    assigned: undefined,
    groupName: "",
    contactEmail: "",
    page: 1,
    limit: 25,
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [data, setData] = useState<EnrichedHousehold[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  const [debouncedSearch] = useDebounce(filters.search, 600);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState("");

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.assigned !== undefined ||
      filters.groupName ||
      filters.contactEmail
  );

  const fetchHouseholds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await HouseholdService.getHouseholds({
        search: debouncedSearch || undefined,
        assigned: filters.assigned,
        groupName: filters.groupName || undefined,
        contactEmail: filters.contactEmail || undefined,
        page: filters.page,
        limit: filters.limit,
      });

      setData(res.households);
      setTotal(res.pagination.total);
    } catch (err) {
      toast.error("Failed to load households");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    debouncedSearch,
    filters.assigned,
    filters.groupName,
    filters.contactEmail,
    filters.page,
    filters.limit,
  ]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval) {
      intervalRef.current = setInterval(fetchHouseholds, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, fetchHouseholds]);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  const handleRefresh = () => {
    setRefreshing(true);
    toast.success("Refreshed");
    fetchHouseholds();
  };

  const handleApplyFilters = () => {
    setFilters({ ...tempFilters, page: 1 });
    setDialogOpen(false);
    toast.success("Filters applied");
  };

  const handleResetFilters = () => {
    const reset: HouseholdFilters = {
      search: "",
      assigned: undefined,
      groupName: "",
      contactEmail: "",
      page: 1,
      limit: 25,
    };
    setFilters(reset);
    setTempFilters(reset);
    toast("Filters cleared");
  };

  const openDialog = () => {
    setTempFilters(filters);
    setDialogOpen(true);
  };

  // Edit contact email
  const startEditing = (household: EnrichedHousehold) => {
    setEditingId(household.id);
    setEditingEmail(household.preassignedContact?.email || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingEmail("");
  };

  const saveEditing = async (householdId: string) => {
    if (!editingEmail.trim() || !editingEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    try {
      toast.loading("Updating contact email...");
      await HouseholdService.updatePreassignedContact(householdId, editingEmail.trim());

      setData((prev) =>
        prev.map((h) =>
          h.id === householdId
            ? {
                ...h,
                preassignedContact: {
                  email: editingEmail.trim(),
                  isActive: true,
                },
              }
            : h
        )
      );

      toast.dismiss();
      toast.success("Contact email updated");
      setEditingId(null);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to update email");
    }
  };

  const columns: ColumnDef<EnrichedHousehold>[] = [
    {
      accessorKey: "hhid",
      header: "HHID",
      cell: ({ row }) => (
        <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
          {row.original.hhid}
        </code>
      ),
    },
    {
      accessorKey: "isAssigned",
      header: "Assigned",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isAssigned ? "default" : "secondary"}
          className="w-16 justify-center"
        >
          {row.original.isAssigned ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <X className="h-3 w-3 mr-1" />
          )}
          {row.original.isAssigned ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "assignedMeterId",
      header: "Meter ID",
      cell: ({ row }) =>
        row.original.assignedMeterId ? (
          <code className="text-xs font-mono">
            {row.original.assignedMeterId}
          </code>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "preassignedContact.email",
      header: "Contact Email",
      cell: ({ row }) => {
        const household = row.original;
        const isEditing = editingId === household.id;

        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            {isEditing ? (
              <>
                <Input
                  type="email"
                  value={editingEmail}
                  onChange={(e) => setEditingEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEditing(household.id);
                    if (e.key === "Escape") cancelEditing();
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => saveEditing(household.id)}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={cancelEditing}
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
              </>
            ) : (
              <>
                <span
                  className={`text-sm ${
                    household.preassignedContact?.email
                      ? "font-medium"
                      : "text-muted-foreground italic"
                  }`}
                >
                  {household.preassignedContact?.email || "—"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => startEditing(household)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "memberCount",
      header: "Members",
      cell: ({ row }) => row.original.memberCount,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <div className="font-mono text-xs">
          {format(new Date(row.original.createdAt), "dd MMM yyyy, HH:mm")}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / (filters.limit || 25)),
  });

  return (
    <div className="p-4 space-y-6">
      <PageHeader
        title="Households"
        description="Manage and monitor all registered households"
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
                            filters.assigned !== undefined && 1,
                            filters.groupName && 1,
                            filters.contactEmail && 1,
                          ].filter(Boolean).length
                        }
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Filter Households</DialogTitle>
                    <DialogDescription>
                      Narrow down the list by search term, assignment status,
                      AWS group or contact email.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-2">
                      <Label>Search HHID</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g., HH001"
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
                      <Label>Assigned Meter</Label>
                      <Select
                        value={tempFilters.assigned ?? "all"}
                        onValueChange={(v) =>
                          setTempFilters((p) => ({
                            ...p,
                            assigned:
                              v === "all" ? undefined : (v as "true" | "false"),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="true">Assigned</SelectItem>
                          <SelectItem value="false">Not Assigned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* <div className="space-y-2">
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
                    </div> */}

                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={tempFilters.contactEmail}
                        onChange={(e) =>
                          setTempFilters((p) => ({
                            ...p,
                            contactEmail: e.target.value,
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
                  <TableCell colSpan={columns.length} className="h-64">
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <Spinner className="h-8 w-8" />
                      <p className="text-muted-foreground">
                        Loading households...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-64">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <AlertCircle className="h-12 w-12 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyTitle>No households found</EmptyTitle>
                        <EmptyDescription>
                          {hasActiveFilters
                            ? "Try adjusting your filters"
                            : "No households have been registered yet"}
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
                    className="hover:bg-muted/50 transition-colors group"
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
              Showing {((filters.page || 1) - 1) * (filters.limit || 25) + 1}–
              {Math.min((filters.page || 1) * (filters.limit || 25), total)} of{" "}
              {total.toLocaleString()} households
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
                    setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))
                  }
                  disabled={(filters.page || 1) === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium p-2 pb-0 border-y">
                  Page {filters.page ?? 1} of{" "}
                  {Math.ceil(total / (filters.limit ?? 25))}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))
                  }
                  disabled={
                    (filters.page || 1) >=
                    Math.ceil(total / (filters.limit || 25))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </ButtonGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}