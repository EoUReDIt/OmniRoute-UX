"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/appConfig";
import { SidebarHeader, SidebarTrigger } from "@omniroute/ui-kit/sidebar";
import OmniRouteLogo, { OmniRouteLockup } from "../OmniRouteLogo";
import Icon from "../Icon";

type SidebarBrandHeaderProps = {
  collapsed: boolean;
  isMobile: boolean;
  isMacElectron: boolean;
  customAppName: string | null;
  customLogo: string | null;
};

function BrandMark({
  collapsed,
  customAppName,
  customLogo,
}: Pick<SidebarBrandHeaderProps, "collapsed" | "customAppName" | "customLogo">) {
  if (collapsed) {
    return customLogo ? (
      // eslint-disable-next-line @next/next/no-img-element -- operator-supplied white-label logo (data: or remote URL), not a static/known asset
      <img src={customLogo} alt="" className="size-6 object-contain" />
    ) : (
      <OmniRouteLogo size={22} />
    );
  }
  return (
    <>
      <OmniRouteLockup
        name={customAppName}
        logoSrc={customLogo}
        className="max-w-full flex-nowrap gap-1.5 whitespace-nowrap [&>.ci-keak-logo]:text-[1.1rem] [&>.ci-keak-product-icon]:size-7 [&_.ci-keak-product]:text-[0.95rem]"
      />
      <span className="text-xs text-text-muted">v{APP_CONFIG.version}</span>
    </>
  );
}

export function SidebarBrandHeader({
  collapsed,
  isMobile,
  isMacElectron,
  customAppName,
  customLogo,
}: SidebarBrandHeaderProps) {
  const tc = useTranslations("common");
  const brandName = customAppName || APP_CONFIG.name;

  return (
    <SidebarHeader>
      <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
        <Link
          href="/home"
          prefetch={false}
          aria-label={brandName}
          title={`${brandName} v${APP_CONFIG.version}`}
          className={cn(
            "flex min-w-0 items-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-4",
            collapsed ? "justify-center" : "flex-1 flex-col items-start gap-0.5"
          )}
        >
          <BrandMark collapsed={collapsed} customAppName={customAppName} customLogo={customLogo} />
        </Link>
        {/* The shell Header owns the collapse/expand trigger (one per page). Only the mobile
              drawer needs its own control: the modal Sheet hides the header while it is open. */}
        {isMobile && (
          <SidebarTrigger
            aria-label={tc("close")}
            title={tc("close")}
            className={cn("shrink-0", isMacElectron && "ms-auto")}
          >
            <Icon name="close" />
          </SidebarTrigger>
        )}
      </div>
    </SidebarHeader>
  );
}
