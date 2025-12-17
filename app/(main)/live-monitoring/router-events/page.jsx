"use client";

import React, { useState } from 'react'
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Filter,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";
import { DateTimePicker, DateTime } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

function Page() {

const [dialogOpen, setDialogOpen] = useState(false);

  return (
        <div className="p-4 space-y-6">
              <PageHeader
                title="Router Events"
                description="Real-time monitoring and historical event log"
                badge={<Badge variant="outline">total</Badge>}
                size="sm"
                actions={
                          <div className="flex flex-wrap items-center gap-3">
                            <ButtonGroup>
                              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button variant="outline">
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filters
                                  </Button>
                                </DialogTrigger> 
                                </Dialog></ButtonGroup>
                                <ButtonGroup>
                                              <Select
                                                // value={refreshInterval ? String(refreshInterval) : "off"}
                                                // onValueChange={(v) =>
                                                //   setRefreshInterval(v === "off" ? null : Number(v))
                                                // }
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
                                                // onClick={handleRefresh}
                                                // disabled={refreshing}
                                                variant="outline"
                                                size="icon"
                                              >
                                                <RefreshCw
                                                //   className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                                                />
                                              </Button>
                                            </ButtonGroup>
                                </div>
                }
                />
              </div>
  )
}

export default Page;
