/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { useDebounce } from "use-debounce";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  X,
  Bell,
  Info,
  CheckCircle2,
  AlertTriangle,
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
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ButtonGroup } from "@/components/ui/button-group";

import eventsService from "@/services/events.service";
import { DateTimePicker, DateTime } from "@/components/ui/date-time-picker";
import { EventMapping } from "@/services/event-mapping.service";
import eventMappingService from "@/services/event-mapping.service";
import { DetailsHoverCard } from "./dialogDetail";

interface Event {
  id: number;
  device_id: string;
  timestamp: number;
  type: number;
  details: Record<string, any>;
  createdAt: string;
}

export default function DeviceEventsPage() {
  const [filters, setFilters] = useState({
    device_id: "",
    type: "",
    page: 1,
    limit: 25,
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [startDateTime, setStartDateTime] = useState<DateTime>({});
  const [endDateTime, setEndDateTime] = useState<DateTime>({});
  const [tempStart, setTempStart] = useState<DateTime>({});
  const [tempEnd, setTempEnd] = useState<DateTime>({});

  const [data, setData] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [eventMappings, setEventMappings] = useState<EventMapping[]>([]);
const [mappingsLoading, setMappingsLoading] = useState(true);

  const [debouncedDeviceId] = useDebounce(filters.device_id, 600);

  const hasActiveFilters = Boolean(
    filters.device_id || filters.type || startDateTime.date || endDateTime.date
  );

  const getUnix = (dt: DateTime): number | undefined => {
    if (!dt.date) return undefined;
    const [h = 0, m = 0] = (dt.time || "00:00").split(":").map(Number);
    const date = new Date(dt.date);
    date.setHours(h, m, 0, 0);
    return Math.floor(date.getTime() / 1000);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = getUnix(startDateTime);
      const end = getUnix(endDateTime);

      const res = await eventsService.getEvents({
        device_id: debouncedDeviceId || undefined,
        type: filters.type || undefined,
        start_time: start,
        end_time: end,
        page: filters.page,
        limit: filters.limit,
      });

      const events = res.events.map((e: any) => ({
        ...e,
        timestamp: Number(e.timestamp),
      }));

      setData(events);
      setTotal(res.pagination.total);
    } catch {
      toast.error("Failed to load events");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    debouncedDeviceId,
    filters.type,
    filters.page,
    filters.limit,
    startDateTime,
    endDateTime,
  ]);

  useEffect(() => {
  const loadMappings = async () => {
    try {
      setMappingsLoading(true);
      const response = await eventMappingService.getAll({ limit: 1000 }); // get all or reasonable limit
      // Sort by type for consistent order
      const sorted = response.data.sort((a, b) => a.type - b.type);
      setEventMappings(sorted);
    } catch (err) {
      console.error("Failed to load event mappings", err);
      toast.error("Failed to load event type definitions");
    } finally {
      setMappingsLoading(false);
    }
  };

  loadMappings();
}, []);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval) {
      intervalRef.current = setInterval(fetchEvents, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, fetchEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = () => {
    toast.success("Refreshed");
    fetchEvents();
  };

  const handleApplyFilters = () => {
     setFilters({
      ...tempFilters,
      type: tempFilters.type === "all" ? "" : tempFilters.type,
      page: 1,
    });
    setStartDateTime(tempStart);
    setEndDateTime(tempEnd);
    setDialogOpen(false);
    toast.success("Filters applied");
  };

  const handleResetFilters = () => {
    const reset = { device_id: "", type: "", page: 1, limit: filters.limit };
    setFilters(reset);
    setTempFilters(reset);
    setStartDateTime({});
    setEndDateTime({});
    setTempStart({});
    setTempEnd({});
    toast("Filters cleared");
  };

  const openDialog = () => {
    setTempFilters(filters);
    setTempStart(startDateTime);
    setTempEnd(endDateTime);
    setDialogOpen(true);
  };

const EventTypeBadge = ({ type }: { type: number }) => {
  const mapping = eventMappings.find(m => m.type === type);
  const isAlert = mapping?.is_alert ?? type >= 14;

  const baseClasses = "gap-1.5 text-xs";
  const content = (
    <>
      {isAlert ? <Bell className="h-3 w-3" /> : <Info className="h-3 w-3" />}
      {mapping ? `${mapping.name} (${type})` : `Type ${type}`}
    </>
  );

  if (isAlert)
    return <Badge variant="outline" className={`border-red-500 text-red-600 ${baseClasses}`}>{content}</Badge>;
  if ([1, 2, 3, 4].includes(type))
    return <Badge variant="outline" className={`border-green-500 text-green-600 ${baseClasses}`}>{content}</Badge>;
  if ([6, 7, 9].includes(type))
    return <Badge variant="outline" className={`border-amber-500 text-amber-600 ${baseClasses}`}>{content}</Badge>;

  return <Badge variant="outline" className={`border-blue-500 text-blue-600 ${baseClasses}`}>{content}</Badge>;
};

  const columns: ColumnDef<Event>[] = [
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => (
        <div className="font-mono text-xs">
          {format(
            new Date(row.original.timestamp * 1000),
            "dd MMM yyyy, HH:mm:ss"
          )}
        </div>
      ),
    },
    {
      accessorKey: "device_id",
      header: "Device ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
          {row.original.device_id}
        </code>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <EventTypeBadge type={row.original.type} />,
    },
   {
    id: "details",
    header: "Details",
    cell: ({ row }) => (
      <DetailsHoverCard details={row.original.details || {}} type={row.original.type} />
    ),
   }



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
        title="Device Events"
        description="Real-time monitoring and historical event log"
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
                            filters.device_id && 1,
                            filters.type && 1,
                            startDateTime.date && 1,
                            endDateTime.date && 1,
                          ].filter(Boolean).length
                        }
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Filter Events</DialogTitle>
                    <DialogDescription>
                      Narrow down events by device, type, or time range.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Device ID */}
                    <div className="space-y-2">
                      <Label>Device ID</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search device..."
                          value={tempFilters.device_id}
                          onChange={(e) =>
                            setTempFilters((p) => ({
                              ...p,
                              device_id: e.target.value,
                            }))
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Event Type */}
                    <div className="space-y-2">
                      <Label>Event Type</Label>
                      <Select
                        value={tempFilters.type}
                        onValueChange={(v) =>
                          setTempFilters((p) => ({ ...p, type: v || "" }))
                        }
                        disabled={mappingsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              mappingsLoading ? "Loading types..." : "All types"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>

                          {mappingsLoading ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center gap-2">
                                <Spinner className="h-3 w-3" />
                                Loading event types...
                              </div>
                            </SelectItem>
                          ) : eventMappings.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No event types defined
                            </SelectItem>
                          ) : (
                            eventMappings.map((mapping) => (
                              <SelectItem
                                key={mapping.id}
                                value={String(mapping.type)}
                              >
                                <div className="flex items-center gap-2">
                                  <span>Type {mapping.type}</span>
                                  <span className="text-muted-foreground">
                                    – {mapping.name}
                                  </span>
                                  {mapping.is_alert && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs ml-2"
                                    >
                                      Alert
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start */}
                    <DateTimePicker
                      label="Start Date & Time"
                      value={tempStart}
                      onChange={setTempStart}
                    />

                    {/* End */}
                    <DateTimePicker
                      label="End Date & Time"
                      value={tempEnd}
                      onChange={setTempEnd}
                    />
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

      {/* Table (unchanged) */}
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
                      <p className="text-muted-foreground">Loading events...</p>
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
                        <EmptyTitle>No events found</EmptyTitle>
                        <EmptyDescription>
                          {hasActiveFilters
                            ? "Try adjusting your filters"
                            : "No events recorded yet"}
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
              {total.toLocaleString()} events
            </p>

            <div className=" flex items-center gap-3">
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
    </div>
  );
}
