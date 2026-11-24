"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "../Icon";
import Button from "../Button";
import Modal, { ConfirmModal } from "../Modal";

/** Shutdown/restart confirmation state and the server calls behind them. */
export function usePowerControls() {
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/shutdown", { method: "POST" });
    } catch {
      // Expected to fail as server shuts down
    }
    setIsShuttingDown(false);
    setShowShutdownModal(false);
    setIsDisconnected(true);
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await fetch("/api/restart", { method: "POST" });
    } catch {
      // Expected to fail as server restarts
    }
    setIsRestarting(false);
    setShowRestartModal(false);
    setIsDisconnected(true);
    setTimeout(() => globalThis.location.reload(), 3000);
  };

  return {
    showShutdownModal,
    showRestartModal,
    isShuttingDown,
    isRestarting,
    isDisconnected,
    openShutdown: () => setShowShutdownModal(true),
    closeShutdown: () => setShowShutdownModal(false),
    openRestart: () => setShowRestartModal(true),
    closeRestart: () => setShowRestartModal(false),
    handleShutdown,
    handleRestart,
  };
}

export type PowerControls = ReturnType<typeof usePowerControls>;

export function SidebarPowerModals({ power }: { power: PowerControls }) {
  const t = useTranslations("sidebar");
  const tc = useTranslations("common");

  return (
    <>
      <ConfirmModal
        isOpen={power.showShutdownModal}
        onClose={power.closeShutdown}
        onConfirm={power.handleShutdown}
        title={t("shutdown")}
        message={t("shutdownConfirm")}
        confirmText={t("shutdown")}
        cancelText={tc("cancel")}
        variant="danger"
        loading={power.isShuttingDown}
      />

      <ConfirmModal
        isOpen={power.showRestartModal}
        onClose={power.closeRestart}
        onConfirm={power.handleRestart}
        title={t("restart")}
        message={t("restartConfirm")}
        confirmText={t("restart")}
        cancelText={tc("cancel")}
        variant="warning"
        loading={power.isRestarting}
      />

      {/* Blocking notice after shutdown: a kit dialog (focus trap, aria-modal) that cannot be
          dismissed — Escape and the overlay are no-ops, reloading is the only way out. */}
      <Modal
        isOpen={power.isDisconnected}
        onClose={() => {}}
        title={t("serverDisconnected")}
        closeOnOverlay={false}
        showCloseButton={false}
        size="sm"
      >
        <div className="text-center">
          <div className="flex items-center justify-center size-16 rounded-full bg-error-bg text-error mx-auto mb-4">
            <Icon name="power_off" size={32} />
          </div>
          <p className="text-text-muted mb-6">{t("serverDisconnectedMsg")}</p>
          <Button variant="secondary" onClick={() => globalThis.location.reload()}>
            {t("reloadPage")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
