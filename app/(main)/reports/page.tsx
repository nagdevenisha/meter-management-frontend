/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { useDebounce } from "use-debounce";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Download,
  Calendar,
  RefreshCw,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { ButtonGroup } from "@/components/ui/button-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import ReportService, {
  ReportEvent,
  ReportFilters,
} from "@/services/report.service";

// Zod Schema
const reportSchema = z.object({
  type: z.string().optional(),
  start_time: z.date().optional(),
  end_time: z.date().optional(),
  format: z.enum(["json", "csv", "xlsx", "xml"]),
});

type ReportForm = z.infer<typeof reportSchema>;

export default function ReportsPage() {
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const form = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: "",
      format: "json",
    },
  });

  const watchFormat = form.watch("format");
  const watchStart = form.watch("start_time");
  const watchEnd = form.watch("end_time");
  const watchType = form.watch("type");

  const [debouncedType] = useDebounce(watchType, 600);

  const fetchPreview = useCallback(async () => {
    if (watchFormat !== "json") {
      setEvents([]);
      setTotal(0);
      return;
    }

    setLoading(true);

    const filters: ReportFilters = {
      type: debouncedType?.trim() || undefined,
      start_time: watchStart
        ? Math.floor(watchStart.getTime() / 1000)
        : undefined,
      end_time: watchEnd ? Math.floor(watchEnd.getTime() / 1000) : undefined,
      page,
      limit,
      format: "json",
    };

    try {
      const res = await ReportService.getReport(filters);
      setEvents(res.data.events || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err: any) {
      toast.error("Failed to load events preview");
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [watchFormat, debouncedType, watchStart, watchEnd, page, limit]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const downloadReport = async () => {
    const values = form.getValues();
    if (!values.start_time || !values.end_time) {
      toast.error("Please select both start and end date");
      return;
    }

    setDownloading(true);
    setDownloadProgress(20);

    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => Math.min(prev + 15, 90));
    }, 500);

    const filters: ReportFilters = {
      type: values.type?.trim() || undefined,
      start_time: Math.floor(values.start_time.getTime() / 1000),
      end_time: Math.floor(values.end_time.getTime() / 1000),
      format: values.format,
    };

    try {
      const blob = await ReportService.getReport(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = values.format === "xlsx" ? "xlsx" : values.format;
      a.download = `events-report-${format(
        new Date(),
        "yyyyMMdd-HHmm"
      )}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      clearInterval(progressInterval);
      setDownloadProgress(100);
      toast.success(
        `Report downloaded successfully (${values.format.toUpperCase()})`
      );
    } catch (err: any) {
      toast.error("Download failed. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setDownloadProgress(0);
        setDownloading(false);
      }, 1000);
    }
  };

  const columns: ColumnDef<ReportEvent>[] = [
    {
      accessorKey: "id",
      header: "Event ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
          {row.original.id}
        </code>
      ),
    },
    {
      accessorKey: "device_id",
      header: "Meter ID",
      cell: ({ row }) => (
        <code className="font-mono text-xs">{row.original.device_id}</code>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="text-xs">
          {format(
            new Date(row.original.timestamp * 1000),
            "MMM d, yyyy HH:mm:ss"
          )}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => (
        <pre className="text-xs font-mono bg-muted p-3 rounded-lg max-w-md overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(row.original.details, null, 2)}
        </pre>
      ),
    },
  ];

  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / limit),
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Event Reports"
        description="Preview and download device events in multiple formats"
        badge={<FileText className="h-5 w-5" />}
        size="lg"
        actions={
          <div className="flex flex-wrap items-end gap-4">
            <Form {...form}>
              <div className="flex flex-wrap items-end gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="min-w-48">
                      <FormLabel>Event Type(s)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="e.g. 3, 14, 100"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem className="min-w-48">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("2020-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem className="min-w-48">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("2020-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem className="min-w-48">
                      <FormLabel>Format</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="json">JSON (Preview)</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="xlsx">Excel</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <Button
                  onClick={downloadReport}
                  disabled={downloading || !watchStart || !watchEnd}
                  className="h-10"
                >
                  {downloading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Report
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </div>
        }
      />

      {downloading && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">Generating report...</span>
            <span className="text-xs text-muted-foreground">
              {downloadProgress}%
            </span>
          </div>
          <Progress value={downloadProgress} className="h-3" />
        </div>
      )}

      {watchFormat === "json" && (
        <div className="rounded-lg border overflow-hidden bg-card">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
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
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Spinner className="h-8 w-8" />
                        <p className="text-muted-foreground">
                          Loading events...
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          </EmptyMedia>
                          <EmptyTitle>No events found</EmptyTitle>
                          <EmptyDescription>
                            Try adjusting your filters or date range
                          </EmptyDescription>
                        </EmptyHeader>
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
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)}{" "}
                of {total.toLocaleString()} events
              </p>

              <div className="flex items-center gap-3">
                <Select
                  value={String(limit)}
                  onValueChange={(v) => {
                    setLimit(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} per page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <ButtonGroup>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 py-2 text-xs font-medium border-y">
                    Page {page} of {Math.ceil(total / limit) || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(total / limit)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </ButtonGroup>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
