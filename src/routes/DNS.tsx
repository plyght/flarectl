import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import {
  listZones,
  listDNSRecords,
  createDNSRecord,
  updateDNSRecord,
  deleteDNSRecord,
  type Zone,
  type DNSRecord,
  type CreateDNSRecordParams,
} from "../lib/cloudflare.ts";
import { isAuthenticated } from "../lib/auth.ts";

type DNSView =
  | { type: "zones" }
  | { type: "records"; zone: Zone };

type ModalState =
  | { type: "none" }
  | { type: "create"; zoneId: string }
  | { type: "edit"; record: DNSRecord; zoneId: string }
  | { type: "delete"; record: DNSRecord; zoneId: string };

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

export function DNS() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [view, setView] = useState<DNSView>({ type: "zones" });
  const [zones, setZones] = useState<Zone[]>([]);
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const [formType, setFormType] = useState("A");
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTTL, setFormTTL] = useState("3600");
  const [formProxied, setFormProxied] = useState(false);
  const [formPriority, setFormPriority] = useState("10");
  const [formField, setFormField] = useState(0);

  const loadZones = useCallback(async () => {
    if (!isAuthenticated()) {
      setError("Not authenticated. Set CLOUDFLARE_API_TOKEN environment variable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listZones();
      setZones(data);
      if (selectedIndex >= data.length) {
        setSelectedIndex(Math.max(0, data.length - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones");
    } finally {
      setLoading(false);
    }
  }, [selectedIndex]);

  const loadRecords = useCallback(async (zone: Zone) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDNSRecords(zone.id);
      setRecords(data);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view.type === "zones") {
      loadZones();
    } else if (view.type === "records") {
      loadRecords(view.zone);
    }
  }, [view, loadZones, loadRecords]);

  const resetForm = useCallback(() => {
    setFormType("A");
    setFormName("");
    setFormContent("");
    setFormTTL("3600");
    setFormProxied(false);
    setFormPriority("10");
    setFormField(0);
  }, []);

  const handleCreate = useCallback(async () => {
    if (modal.type !== "create") return;
    try {
      const params: CreateDNSRecordParams = {
        type: formType,
        name: formName,
        content: formContent,
        ttl: parseInt(formTTL) || 3600,
        proxied: formProxied,
      };
      if (formType === "MX" || formType === "SRV") {
        params.priority = parseInt(formPriority) || 10;
      }
      await createDNSRecord(modal.zoneId, params);
      setModal({ type: "none" });
      resetForm();
      if (view.type === "records") {
        loadRecords(view.zone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create record");
    }
  }, [modal, formType, formName, formContent, formTTL, formProxied, formPriority, view, loadRecords, resetForm]);

  const handleUpdate = useCallback(async () => {
    if (modal.type !== "edit") return;
    try {
      await updateDNSRecord(modal.zoneId, modal.record.id, {
        type: formType,
        name: formName,
        content: formContent,
        ttl: parseInt(formTTL) || 3600,
        proxied: formProxied,
        priority: formType === "MX" || formType === "SRV" ? parseInt(formPriority) || 10 : undefined,
      });
      setModal({ type: "none" });
      resetForm();
      if (view.type === "records") {
        loadRecords(view.zone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update record");
    }
  }, [modal, formType, formName, formContent, formTTL, formProxied, formPriority, view, loadRecords, resetForm]);

  const handleDelete = useCallback(async () => {
    if (modal.type !== "delete") return;
    try {
      await deleteDNSRecord(modal.zoneId, modal.record.id);
      setModal({ type: "none" });
      if (view.type === "records") {
        loadRecords(view.zone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    }
  }, [modal, view, loadRecords]);

  const openEditModal = useCallback((record: DNSRecord, zoneId: string) => {
    setFormType(record.type);
    setFormName(record.name);
    setFormContent(record.content);
    setFormTTL(record.ttl.toString());
    setFormProxied(record.proxied);
    setFormPriority(record.priority?.toString() || "10");
    setFormField(0);
    setModal({ type: "edit", record, zoneId });
  }, []);

  useKeyboard((key) => {
    if (modal.type !== "none") {
      if (key.name === "escape") {
        setModal({ type: "none" });
        resetForm();
        return;
      }
      if (modal.type === "delete") {
        if (key.name === "y") {
          handleDelete();
        } else if (key.name === "n") {
          setModal({ type: "none" });
        }
        return;
      }
      if (modal.type === "create" || modal.type === "edit") {
        const maxFields = (formType === "MX" || formType === "SRV") ? 5 : 4;
        if (key.name === "tab" || key.name === "down" || key.name === "j") {
          setFormField((f) => (f + 1) % maxFields);
          return;
        }
        if ((key.name === "up" || key.name === "k") && !key.shift) {
          setFormField((f) => (f - 1 + maxFields) % maxFields);
          return;
        }
        if (key.name === "return" && key.ctrl) {
          if (modal.type === "create") handleCreate();
          else handleUpdate();
          return;
        }
        if (formField === 0 && (key.name === "left" || key.name === "right")) {
          const idx = RECORD_TYPES.indexOf(formType);
          if (key.name === "left") {
            const newType = RECORD_TYPES[(idx - 1 + RECORD_TYPES.length) % RECORD_TYPES.length];
            if (newType) setFormType(newType);
          } else {
            const newType = RECORD_TYPES[(idx + 1) % RECORD_TYPES.length];
            if (newType) setFormType(newType);
          }
          return;
        }
        if (formField === 4 && (key.name === "space" || key.name === "return")) {
          setFormProxied(!formProxied);
          return;
        }
        return;
      }
      return;
    }

    const maxIndex = view.type === "zones" ? zones.length - 1 : records.length - 1;

    switch (key.name) {
      case "j":
      case "down":
        setSelectedIndex((i) => Math.min(i + 1, maxIndex));
        break;
      case "k":
      case "up":
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "return":
        if (view.type === "zones" && zones[selectedIndex]) {
          setView({ type: "records", zone: zones[selectedIndex] });
          setSelectedIndex(0);
        }
        break;
      case "escape":
      case "backspace":
        if (view.type === "records") {
          setView({ type: "zones" });
          setSelectedIndex(0);
        }
        break;
      case "c":
        if (view.type === "records") {
          resetForm();
          setModal({ type: "create", zoneId: view.zone.id });
        }
        break;
      case "e":
        if (view.type === "records" && records[selectedIndex]) {
          openEditModal(records[selectedIndex], view.zone.id);
        }
        break;
      case "d":
      case "x":
        if (view.type === "records" && records[selectedIndex]) {
          setModal({ type: "delete", record: records[selectedIndex], zoneId: view.zone.id });
        }
        break;
      case "p":
        if (view.type === "records" && records[selectedIndex] && records[selectedIndex].proxiable) {
          const record = records[selectedIndex];
          updateDNSRecord(view.zone.id, record.id, { proxied: !record.proxied })
            .then(() => loadRecords(view.zone))
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to toggle proxy"));
        }
        break;
      case "r":
        if (view.type === "zones") loadZones();
        else if (view.type === "records") loadRecords(view.zone);
        break;
    }
  });

  if (loading && ((view.type === "zones" && zones.length === 0) || (view.type === "records" && records.length === 0))) {
    return (
      <box flexDirection="column" flexGrow={1} padding={2}>
        <box flexDirection="row" gap={1}>
          <text fg={colors.primary}>⟳</text>
          <text fg={colors.textMuted}>Loading...</text>
        </box>
      </box>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "A": return colors.success;
      case "AAAA": return colors.info;
      case "CNAME": return colors.warning;
      case "MX": return colors.error;
      case "TXT": return colors.textMuted;
      default: return colors.text;
    }
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        padding={1}
        borderStyle="single"
        borderColor={colors.border}
        backgroundColor={colors.backgroundAlt}
      >
        <box flexDirection="row" gap={2}>
          <text fg={colors.primary}>
            <strong>◉ DNS Management</strong>
          </text>
          {view.type === "zones" ? (
            <text fg={colors.textMuted}>{zones.length} zones</text>
          ) : (
            <text fg={colors.textMuted}>
              {view.zone.name} • {records.length} records
            </text>
          )}
        </box>
        {loading && <text fg={colors.warning}>⟳</text>}
      </box>

      {error && (
        <box padding={1} backgroundColor={colors.error}>
          <text fg={colors.textInverse}>❌ {error}</text>
        </box>
      )}

      <box flexDirection="column" flexGrow={1} padding={1}>
        {view.type === "zones" && (
          <>
            <box flexDirection="row" padding={1} borderStyle="single" borderColor={colors.border} backgroundColor={colors.surfaceAlt}>
              <box width={35}><text fg={colors.textMuted}><strong>DOMAIN</strong></text></box>
              <box width={12}><text fg={colors.textMuted}><strong>STATUS</strong></text></box>
              <box width={15}><text fg={colors.textMuted}><strong>PLAN</strong></text></box>
              <box flexGrow={1}><text fg={colors.textMuted}><strong>NAMESERVERS</strong></text></box>
            </box>
            <scrollbox flexGrow={1} focused>
              {zones.length === 0 ? (
                <box padding={2} flexDirection="column" alignItems="center">
                  <text fg={colors.textMuted}>No zones found</text>
                </box>
              ) : (
                zones.map((zone, index) => {
                  const isSelected = index === selectedIndex;
                  const statusColor = zone.status === "active" ? colors.success : colors.warning;
                  return (
                    <box key={zone.id} flexDirection="row" padding={1} backgroundColor={isSelected ? colors.surfaceAlt : "transparent"}>
                      <box width={35}>
                        <text fg={isSelected ? colors.primary : colors.text}>
                          {isSelected ? "▸ " : "  "}🌐 {zone.name}
                        </text>
                      </box>
                      <box width={12}>
                        <text fg={statusColor}>{zone.status}</text>
                      </box>
                      <box width={15}>
                        <text fg={colors.info}>{zone.plan.name}</text>
                      </box>
                      <box flexGrow={1}>
                        <text fg={colors.textMuted}>{zone.name_servers.slice(0, 2).join(", ")}</text>
                      </box>
                    </box>
                  );
                })
              )}
            </scrollbox>
          </>
        )}

        {view.type === "records" && (
          <>
            <box flexDirection="row" padding={1} borderStyle="single" borderColor={colors.border} backgroundColor={colors.surfaceAlt}>
              <box width={8}><text fg={colors.textMuted}><strong>TYPE</strong></text></box>
              <box width={30}><text fg={colors.textMuted}><strong>NAME</strong></text></box>
              <box width={35}><text fg={colors.textMuted}><strong>CONTENT</strong></text></box>
              <box width={8}><text fg={colors.textMuted}><strong>TTL</strong></text></box>
              <box width={8}><text fg={colors.textMuted}><strong>PROXY</strong></text></box>
            </box>
            <scrollbox flexGrow={1} focused>
              {records.length === 0 ? (
                <box padding={2} flexDirection="column" alignItems="center">
                  <text fg={colors.textMuted}>No records • Press [c] to create</text>
                </box>
              ) : (
                records.map((record, index) => {
                  const isSelected = index === selectedIndex;
                  const shortName = record.name.replace(`.${view.zone.name}`, "").replace(view.zone.name, "@");
                  const shortContent = record.content.length > 32 ? record.content.slice(0, 32) + "…" : record.content;
                  return (
                    <box key={record.id} flexDirection="row" padding={1} backgroundColor={isSelected ? colors.surfaceAlt : "transparent"}>
                      <box width={8}>
                        <text fg={getTypeColor(record.type)}>
                          {isSelected ? "▸" : " "}{record.type.padEnd(5)}
                        </text>
                      </box>
                      <box width={30}>
                        <text fg={isSelected ? colors.primary : colors.text}>{shortName}</text>
                      </box>
                      <box width={35}>
                        <text fg={colors.textMuted}>{shortContent}</text>
                      </box>
                      <box width={8}>
                        <text fg={colors.textMuted}>{record.ttl === 1 ? "Auto" : record.ttl}</text>
                      </box>
                      <box width={8}>
                        <text fg={record.proxied ? colors.warning : colors.textMuted}>
                          {record.proxied ? "☁️" : "⚫"}
                        </text>
                      </box>
                    </box>
                  );
                })
              )}
            </scrollbox>
          </>
        )}
      </box>

      <box flexDirection="row" gap={2} padding={1} borderStyle="single" borderColor={colors.border} backgroundColor={colors.backgroundAlt}>
        <text fg={colors.primary}>[j/k]</text><text fg={colors.textMuted}>Navigate</text>
        {view.type === "zones" && (
          <>
            <text fg={colors.primary}>[Enter]</text><text fg={colors.textMuted}>View Records</text>
          </>
        )}
        {view.type === "records" && (
          <>
            <text fg={colors.primary}>[c]</text><text fg={colors.textMuted}>Create</text>
            <text fg={colors.primary}>[e]</text><text fg={colors.textMuted}>Edit</text>
            <text fg={colors.primary}>[d]</text><text fg={colors.textMuted}>Delete</text>
            <text fg={colors.primary}>[p]</text><text fg={colors.textMuted}>Toggle Proxy</text>
            <text fg={colors.primary}>[Esc]</text><text fg={colors.textMuted}>Back</text>
          </>
        )}
        <text fg={colors.primary}>[r]</text><text fg={colors.textMuted}>Refresh</text>
      </box>

      {modal.type === "delete" && (
        <box position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="center" alignItems="center" backgroundColor="rgba(0,0,0,0.7)">
          <box flexDirection="column" borderStyle="double" borderColor={colors.error} backgroundColor={colors.surface} padding={2} minWidth={50}>
            <text fg={colors.error}><strong>⚠ Confirm Delete</strong></text>
            <box marginTop={1}>
              <text fg={colors.text}>Delete record "{modal.record.name}"?</text>
            </box>
            <box marginTop={1}>
              <text fg={colors.textMuted}>[y] Yes  [n] No</text>
            </box>
          </box>
        </box>
      )}

      {(modal.type === "create" || modal.type === "edit") && (
        <box position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="center" alignItems="center" backgroundColor="rgba(0,0,0,0.7)">
          <box flexDirection="column" borderStyle="double" borderColor={colors.primary} backgroundColor={colors.surface} padding={2} minWidth={60}>
            <text fg={colors.primary}>
              <strong>{modal.type === "create" ? "Create DNS Record" : "Edit DNS Record"}</strong>
            </text>

            <box marginTop={1} flexDirection="row" gap={2}>
              <text fg={colors.text}>Type:</text>
              <box flexDirection="row" gap={1}>
                {RECORD_TYPES.map((t) => (
                  <text key={t} fg={formType === t ? colors.primary : colors.textMuted}>
                    {formField === 0 && formType === t ? `[${t}]` : t}
                  </text>
                ))}
              </box>
            </box>

            <box marginTop={1}>
              <text fg={colors.text}>Name: </text>
              <input
                value={formName}
                onChange={setFormName}
                placeholder="@ or subdomain"
                focused={formField === 1}
                width={40}
                backgroundColor={formField === 1 ? colors.backgroundAlt : colors.surface}
                textColor={colors.text}
              />
            </box>

            <box marginTop={1}>
              <text fg={colors.text}>Content: </text>
              <input
                value={formContent}
                onChange={setFormContent}
                placeholder="IP address or value"
                focused={formField === 2}
                width={40}
                backgroundColor={formField === 2 ? colors.backgroundAlt : colors.surface}
                textColor={colors.text}
              />
            </box>

            <box marginTop={1}>
              <text fg={colors.text}>TTL: </text>
              <input
                value={formTTL}
                onChange={setFormTTL}
                placeholder="3600"
                focused={formField === 3}
                width={10}
                backgroundColor={formField === 3 ? colors.backgroundAlt : colors.surface}
                textColor={colors.text}
              />
              <text fg={colors.textMuted}> (1 = Auto)</text>
            </box>

            {(formType === "MX" || formType === "SRV") && (
              <box marginTop={1}>
                <text fg={colors.text}>Priority: </text>
                <input
                  value={formPriority}
                  onChange={setFormPriority}
                  placeholder="10"
                  focused={formField === 4}
                  width={10}
                  backgroundColor={formField === 4 ? colors.backgroundAlt : colors.surface}
                  textColor={colors.text}
                />
              </box>
            )}

            {(formType === "A" || formType === "AAAA" || formType === "CNAME") && (
              <box marginTop={1}>
                <text fg={colors.text}>Proxied: </text>
                <text fg={formProxied ? colors.warning : colors.textMuted}>
                  {formField === 4 ? "[" : ""}{formProxied ? "☁️ Yes" : "⚫ No"}{formField === 4 ? "]" : ""}
                </text>
                <text fg={colors.textMuted}> (Space to toggle)</text>
              </box>
            )}

            <box marginTop={2}>
              <text fg={colors.textMuted}>Tab/↓ next field • Ctrl+Enter to save • Esc to cancel</text>
            </box>
          </box>
        </box>
      )}
    </box>
  );
}
