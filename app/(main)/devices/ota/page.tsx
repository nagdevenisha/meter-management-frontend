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
  Upload,
  File,
  Download,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ButtonGroup } from "@/components/ui/button-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import OtaService, { OtaJob } from "@/services/ota.service";

// Zod Schema
const otaJobSchema = z.object({
  version: z.string().min(1, "Version is required"),
  bucketName: z.string().optional(),
  thingGroupName: z.string().optional(),
  thingNames: z.string().optional(),
  downloadPath: z.string().min(1, "Download path is required"),
});

type OtaJobForm = z.infer<typeof otaJobSchema>;

export default function OtaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [jobs, setJobs] = useState<OtaJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 600);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<number | null>(30000); // 30s default

  const form = useForm<OtaJobForm>({
    resolver: zodResolver(otaJobSchema),
    defaultValues: {
      version: "",
      bucketName: process.env.NEXT_PUBLIC_DEFAULT_S3_BUCKET || "",
      thingGroupName: "",
      thingNames: "",
      downloadPath: "/tmp/firmware.bin",
    },
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await OtaService.getMyJobs(
        page,
        limit,
        debouncedSearch || undefined
      );
      setJobs(res.jobs);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      toast.error("Failed to load OTA jobs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchJobs, autoRefresh);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    toast.success("Refreshed");
    fetchJobs();
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error("File must be under 100MB");
      return;
    }
    setFile(selectedFile);
    toast.success(`Selected: ${selectedFile.name}`);
  };

  const onSubmit = async (values: OtaJobForm) => {
    if (!file) {
      toast.error("Please select a firmware file");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90));
    }, 500);

    try {
      await OtaService.createJob(file, values);
      clearInterval(interval);
      setUploadProgress(100);

      toast.success("OTA Job created successfully!");
      setDialogOpen(false);
      setFile(null);
      form.reset();
      fetchJobs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create OTA job");
    } finally {
      clearInterval(interval);
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const getStatusBadge = (status: OtaJob["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-600 text-white flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            In Progress
          </Badge>
        );
      case "SUCCEEDED":
        return (
          <Badge className="bg-green-600 text-white flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Succeeded
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "CANCELED":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Canceled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: ColumnDef<OtaJob>[] = [
    {
      accessorKey: "jobId",
      header: "Job ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
          {row.original.jobId.slice(0, 12)}...
        </code>
      ),
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.version}</span>
      ),
    },
    {
      accessorKey: "fileName",
      header: "Firmware",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <File className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs">{row.original.fileName}</span>
        </div>
      ),
    },
    {
      accessorKey: "targets",
      header: "Targets",
      cell: ({ row }) => {
        const targets = row.original.targets;
        return (
          <span className="text-xs">
            {targets.length === 1
              ? targets[0].split("/").pop()
              : `${targets.length} devices`}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.original.createdAt), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(row.original.s3UrlUpdate, "_blank")}
        >
          <Download className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / limit),
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="OTA Firmware Updates"
        description="Deploy new firmware to your devices securely over-the-air"
        size="sm"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search version..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <ButtonGroup>
              <Select
                value={autoRefresh ? String(autoRefresh) : "off"}
                onValueChange={(v) =>
                  setAutoRefresh(v === "off" ? null : Number(v))
                }
              >
                <SelectTrigger className="w-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Auto-refresh: Off</SelectItem>
                  <SelectItem value="10000">Every 10s</SelectItem>
                  <SelectItem value="30000">Every 30s</SelectItem>
                  <SelectItem value="60000">Every 1 min</SelectItem>
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

            <Button onClick={() => setDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Create OTA Job
            </Button>
          </div>
        }
      />

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
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
                      <p className="text-muted-foreground">
                        Loading OTA jobs...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <File className="h-12 w-12 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyTitle>No OTA jobs found</EmptyTitle>
                        <EmptyDescription>
                          {search
                            ? "Try adjusting your search"
                            : "Create your first firmware update job"}
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button onClick={() => setDialogOpen(true)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Create OTA Job
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
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

        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)}{" "}
              of {total.toLocaleString()} jobs
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
                      {n} rows
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
                <span className="text-xs font-medium px-3 border-y">
                  Page {page} / {Math.ceil(total / limit) || 1}
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

      {/* Create OTA Job Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Create OTA Update Job</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* File Upload */}
              <div
                className={`border-2 border-dashed rounded-lg p-10 text-center transition-all
                  ${
                    file
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }
                  ${uploading ? "opacity-60" : "cursor-pointer"}`}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleFileSelect(f);
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() =>
                  !uploading && document.getElementById("ota-file")?.click()
                }
              >
                <input
                  id="ota-file"
                  type="file"
                  className="hidden"
                  accept=".bin,.hex,.zip"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFileSelect(e.target.files[0])
                  }
                />
                {file ? (
                  <div className="space-y-3">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Drop firmware file here</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        or click to browse • .bin, .hex, .zip • Max 100MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Uploading & creating job...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-3" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firmware Version *</FormLabel>
                      <FormControl>
                        <Input placeholder="1.5.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="downloadPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Download Path on Device *</FormLabel>
                      <FormControl>
                        <Input placeholder="/tmp/firmware.bin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bucketName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>S3 Bucket (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          process.env.NEXT_PUBLIC_DEFAULT_S3_BUCKET ||
                          "my-firmware-bucket"
                        }
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="thingGroupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Thing Group (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="armenia_meter" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thingNames"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Specific Thing Names (comma-separated)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="meter-001, meter-002" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading || !file}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Job...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Create OTA Job
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
