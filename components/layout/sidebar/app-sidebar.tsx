/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Boxes,
  Cpu,
  Activity,
  SatelliteDish,
  Users,
  Settings,
  Wrench,
  PackageSearch,
  Database,
  Home,
  UploadCloud,
  GitMerge,
  Upload,
  Trash2,
  Bell,
  FileText,
  BarChart3,
  HeartPulse,
  Camera,
  ClipboardList,
  DatabaseZap,
  GitBranch,
  RefreshCw,
  PowerOff,
  Settings2,
  Monitor,
  Video,
  BellRing,
  Network,
  UserCog,
  SlidersHorizontal,
  type LucideIcon,
  Router,
} from "lucide-react";

import { NavMain } from "@/components/layout/sidebar/nav-main";
import { NavProjects } from "@/components/layout/sidebar/nav-projects";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "../../ui/separator";
import navConfig from "@/config/nav-config.json";
import { CompanyHeader } from "./company-header";
import { useRole } from "@/hooks/use-role";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  roles?: string[];
  items?: { title: string; url: string; icon: LucideIcon; roles: string[] }[];
}

interface ProjectItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

const iconMap: { [key: string]: LucideIcon } = {
  LayoutGrid,
  Boxes,
  Cpu,
  Activity,
  SatelliteDish,
  Users,
  Settings,
  Wrench,
  PackageSearch,
  Database,
  Home,
  UploadCloud,
  GitMerge,
  Upload,
  Trash2,
  Bell,
  FileText,
  BarChart3,
  HeartPulse,
  Camera,
  ClipboardList,
  DatabaseZap,
  GitBranch,
  RefreshCw,
  PowerOff,
  Settings2,
  Monitor,
  Video,
  BellRing,
  Network,
  UserCog,
  SlidersHorizontal,
  Router
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const userRole = useRole();
  const [filteredNavMain, setFilteredNavMain] = useState<NavItem[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectItem[]>([]);

  useEffect(() => {
    if (!userRole) {
      setFilteredNavMain([]);
      setFilteredProjects([]);
      return;
    }

    const filteredMain = navConfig.navMain
      .filter((item: any) => {
        const hasMainRole = item.roles?.includes(userRole);
        const hasSubItemRole = item.items?.some((sub: any) =>
          sub.roles?.includes(userRole)
        );
        return hasMainRole || hasSubItemRole;
      })
      .map((item: any) => ({
        ...item,
        icon: iconMap[item.icon],
        items: item.items
          ? item.items
              .filter((sub: any) => sub.roles?.includes(userRole))
              .map((sub: any) => ({
                ...sub,
                icon: iconMap[sub.icon],
              }))
          : undefined,
      }));

    const filteredProj = navConfig.projects
      .filter((proj: any) => proj.roles?.includes(userRole))
      .map((proj: any) => ({
        ...proj,
        icon: iconMap[proj.icon],
      }));

    setFilteredNavMain(filteredMain);
    setFilteredProjects(filteredProj);
  }, [userRole]);

  return (
    <Sidebar collapsible="icon" {...props} variant="sidebar">
      <SidebarHeader>
        <CompanyHeader />
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        {filteredProjects.length > 0 && (
          <>
            <Separator />
            <NavProjects projects={filteredProjects} />
          </>
        )}
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
