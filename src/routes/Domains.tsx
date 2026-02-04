import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import {
  listDomains,
  getDomain,
  checkDomainAvailability,
  updateDomain,
  type Domain,
  type DomainAvailability,
} from "../lib/cloudflare.ts";

type View = "list" | "search" | "details";
type Tab = "domains" | "search" | "transfer";

export function Domains() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<Tab>("domains");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<DomainAvailability | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState(false);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDomains();
      setDomains(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load domains");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const searchDomain = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const result = await checkDomainAvailability(searchQuery.trim());
      setSearchResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleAutoRenew = async (domain: Domain) => {
    try {
      await updateDomain(domain.name, { auto_renew: !domain.auto_renew });
      setActionMessage(`Auto-renew ${!domain.auto_renew ? "enabled" : "disabled"} for ${domain.name}`);
      loadDomains();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update domain");
    }
  };

  const toggleLock = async (domain: Domain) => {
    try {
      await updateDomain(domain.name, { locked: !domain.locked });
      setActionMessage(`Domain ${domain.name} ${!domain.locked ? "locked" : "unlocked"}`);
      loadDomains();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update domain");
    }
  };

  useKeyboard((key) => {
    if (inputMode) {
      if (key.name === "escape") {
        setInputMode(false);
        setSearchQuery("");
      } else if (key.name === "return") {
        searchDomain();
        setInputMode(false);
      } else if (key.name === "backspace") {
        setSearchQuery((prev) => prev.slice(0, -1));
      } else if (key.sequence && key.sequence.length === 1 && /^[a-zA-Z0-9.-]$/.test(key.sequence)) {
        setSearchQuery((prev) => prev + key.sequence);
      }
      return;
    }

    if (view === "details" && selectedDomain) {
      if (key.name === "escape" || key.name === "q") {
        setView("list");
        setSelectedDomain(null);
      } else if (key.name === "a") {
        toggleAutoRenew(selectedDomain);
      } else if (key.name === "l") {
        toggleLock(selectedDomain);
      }
      return;
    }

    if (key.name === "tab" || key.name === "right") {
      const tabs: Tab[] = ["domains", "search", "transfer"];
      const currentIndex = tabs.indexOf(tab);
      const nextTab = tabs[(currentIndex + 1) % tabs.length];
      if (nextTab) setTab(nextTab);
    } else if (key.name === "left") {
      const tabs: Tab[] = ["domains", "search", "transfer"];
      const currentIndex = tabs.indexOf(tab);
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      if (prevTab) setTab(prevTab);
    }

    if (tab === "domains") {
      if (key.name === "up" || key.name === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "down" || key.name === "j") {
        setSelectedIndex((prev) => Math.min(domains.length - 1, prev + 1));
      } else if (key.name === "return" && domains[selectedIndex]) {
        setSelectedDomain(domains[selectedIndex]);
        setView("details");
      } else if (key.name === "r") {
        loadDomains();
      }
    } else if (tab === "search") {
      if (key.name === "s" || key.name === "return") {
        setInputMode(true);
      }
    }
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "pending":
        return colors.warning;
      case "expired":
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const renderTabs = () => (
    <box flexDirection="row" gap={2} marginBottom={1}>
      {(["domains", "search", "transfer"] as Tab[]).map((t) => (
        <box
          key={t}
          paddingLeft={2}
          paddingRight={2}
          borderStyle={tab === t ? "single" : undefined}
          borderColor={tab === t ? colors.primary : undefined}
          backgroundColor={tab === t ? colors.surfaceAlt : undefined}
        >
          <text>
            <span fg={tab === t ? colors.primary : colors.textMuted}>
              {t === "domains" ? "My Domains" : t === "search" ? "Search" : "Transfer"}
            </span>
          </text>
        </box>
      ))}
    </box>
  );

  const renderDomainsList = () => (
    <box flexDirection="column" gap={1}>
      {loading ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.info}>Loading domains...</span>
          </text>
        </box>
      ) : error ? (
        <box borderStyle="single" borderColor={colors.error} padding={1}>
          <text>
            <span fg={colors.error}>Error: {error}</span>
          </text>
        </box>
      ) : domains.length === 0 ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No domains registered. Use the Search tab to find and register domains.</span>
          </text>
        </box>
      ) : (
        <box flexDirection="column">
          <box
            flexDirection="row"
            paddingLeft={1}
            paddingRight={1}
            paddingBottom={1}
          >
            <box width={30}>
              <text>
                <span fg={colors.textMuted}>Domain</span>
              </text>
            </box>
            <box width={12}>
              <text>
                <span fg={colors.textMuted}>Status</span>
              </text>
            </box>
            <box width={14}>
              <text>
                <span fg={colors.textMuted}>Expires</span>
              </text>
            </box>
            <box width={12}>
              <text>
                <span fg={colors.textMuted}>Auto-Renew</span>
              </text>
            </box>
            <box width={10}>
              <text>
                <span fg={colors.textMuted}>Locked</span>
              </text>
            </box>
          </box>
          {domains.map((domain, index) => (
            <box
              key={domain.id}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={0}
              backgroundColor={index === selectedIndex ? colors.surfaceAlt : undefined}
            >
              <box width={30}>
                <text>
                  <span fg={index === selectedIndex ? colors.primary : colors.text}>
                    {domain.name}
                  </span>
                </text>
              </box>
              <box width={12}>
                <text>
                  <span fg={getStatusColor(domain.status)}>{domain.status}</span>
                </text>
              </box>
              <box width={14}>
                <text>
                  <span fg={colors.textMuted}>{formatDate(domain.expires_at)}</span>
                </text>
              </box>
              <box width={12}>
                <text>
                  <span fg={domain.auto_renew ? colors.success : colors.warning}>
                    {domain.auto_renew ? "Yes" : "No"}
                  </span>
                </text>
              </box>
              <box width={10}>
                <text>
                  <span fg={domain.locked ? colors.success : colors.warning}>
                    {domain.locked ? "Yes" : "No"}
                  </span>
                </text>
              </box>
            </box>
          ))}
        </box>
      )}
      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>
            ↑/↓ Navigate • Enter View Details • r Refresh
          </span>
        </text>
      </box>
    </box>
  );

  const renderSearch = () => (
    <box flexDirection="column" gap={1}>
      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Search for available domains:</span>
          </text>
          <box
            flexDirection="row"
            gap={1}
            borderStyle="single"
            borderColor={inputMode ? colors.primary : colors.border}
            padding={1}
          >
            <text>
              <span fg={colors.textMuted}>Domain: </span>
              <span fg={colors.text}>{searchQuery || (inputMode ? "_" : "Press 's' to search")}</span>
            </text>
          </box>
          {searchLoading && (
            <text>
              <span fg={colors.info}>Checking availability...</span>
            </text>
          )}
        </box>
      </box>

      {searchResult && (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <box flexDirection="column" gap={1}>
            <box flexDirection="row" gap={2}>
              <text>
                <span fg={colors.text}>Domain: </span>
                <span fg={colors.primary}>{searchResult.name}</span>
              </text>
            </box>
            <box flexDirection="row" gap={2}>
              <text>
                <span fg={colors.text}>Available: </span>
                <span fg={searchResult.available ? colors.success : colors.error}>
                  {searchResult.available ? "Yes" : "No"}
                </span>
              </text>
            </box>
            {searchResult.premium && (
              <text>
                <span fg={colors.warning}>Premium domain</span>
              </text>
            )}
            {searchResult.available && searchResult.price && (
              <box flexDirection="row" gap={2}>
                <text>
                  <span fg={colors.text}>Price: </span>
                  <span fg={colors.success}>${searchResult.price}/year</span>
                </text>
              </box>
            )}
            {searchResult.available && searchResult.can_register && (
              <box marginTop={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.success}>
                <text>
                  <span fg={colors.textInverse}>
                    Register through Cloudflare Dashboard to complete purchase
                  </span>
                </text>
              </box>
            )}
          </box>
        </box>
      )}

      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>s Start search • Enter Submit • Esc Cancel</span>
        </text>
      </box>
    </box>
  );

  const renderTransfer = () => (
    <box flexDirection="column" gap={1}>
      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.primary}>Transfer Domain to Cloudflare</span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              Transfer your existing domains to Cloudflare Registrar at cost.
            </span>
          </text>
          <box marginTop={1}>
            <text>
              <span fg={colors.text}>Benefits:</span>
            </text>
          </box>
          <box paddingLeft={2} flexDirection="column">
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.text}> No markup - pay wholesale price</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.text}> Free WHOIS privacy</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.text}> DNSSEC enabled by default</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.text}> Seamless integration with Cloudflare services</span>
            </text>
          </box>
          <box marginTop={1} borderStyle="single" borderColor={colors.info} padding={1}>
            <text>
              <span fg={colors.info}>
                To transfer a domain, initiate the process from Cloudflare Dashboard: {"\n"}
                Dashboard → Registrar → Transfer
              </span>
            </text>
          </box>
        </box>
      </box>
    </box>
  );

  const renderDetails = () => {
    if (!selectedDomain) return null;
    return (
      <box flexDirection="column" gap={1}>
        <box flexDirection="row" gap={2}>
          <text>
            <span fg={colors.textMuted}>← Esc to go back</span>
          </text>
        </box>
        <box borderStyle="single" borderColor={colors.primary} padding={1}>
          <box flexDirection="column" gap={1}>
            <text>
              <span fg={colors.primary}>{selectedDomain.name}</span>
            </text>
            <box flexDirection="row" flexWrap="wrap" gap={2}>
              <box flexDirection="column" width={30}>
                <text>
                  <span fg={colors.textMuted}>Status</span>
                </text>
                <text>
                  <span fg={getStatusColor(selectedDomain.status)}>{selectedDomain.status}</span>
                </text>
              </box>
              <box flexDirection="column" width={30}>
                <text>
                  <span fg={colors.textMuted}>Expires</span>
                </text>
                <text>
                  <span fg={colors.text}>{formatDate(selectedDomain.expires_at)}</span>
                </text>
              </box>
              <box flexDirection="column" width={30}>
                <text>
                  <span fg={colors.textMuted}>Created</span>
                </text>
                <text>
                  <span fg={colors.text}>{formatDate(selectedDomain.created_at)}</span>
                </text>
              </box>
            </box>
          </box>
        </box>

        <box flexDirection="row" gap={2}>
          <box
            borderStyle="single"
            borderColor={selectedDomain.auto_renew ? colors.success : colors.border}
            padding={1}
            width={25}
          >
            <box flexDirection="column">
              <text>
                <span fg={colors.text}>Auto-Renew</span>
              </text>
              <text>
                <span fg={selectedDomain.auto_renew ? colors.success : colors.warning}>
                  {selectedDomain.auto_renew ? "Enabled" : "Disabled"}
                </span>
              </text>
              <text>
                <span fg={colors.textMuted}>[a] Toggle</span>
              </text>
            </box>
          </box>
          <box
            borderStyle="single"
            borderColor={selectedDomain.locked ? colors.success : colors.border}
            padding={1}
            width={25}
          >
            <box flexDirection="column">
              <text>
                <span fg={colors.text}>Domain Lock</span>
              </text>
              <text>
                <span fg={selectedDomain.locked ? colors.success : colors.warning}>
                  {selectedDomain.locked ? "Locked" : "Unlocked"}
                </span>
              </text>
              <text>
                <span fg={colors.textMuted}>[l] Toggle</span>
              </text>
            </box>
          </box>
        </box>

        {selectedDomain.registrant_contact && (
          <box borderStyle="single" borderColor={colors.border} padding={1}>
            <box flexDirection="column" gap={1}>
              <text>
                <span fg={colors.text}>Registrant Contact</span>
              </text>
              <text>
                <span fg={colors.textMuted}>
                  {selectedDomain.registrant_contact.first_name} {selectedDomain.registrant_contact.last_name}
                </span>
              </text>
              <text>
                <span fg={colors.textMuted}>{selectedDomain.registrant_contact.email}</span>
              </text>
              <text>
                <span fg={colors.textMuted}>
                  {selectedDomain.registrant_contact.city}, {selectedDomain.registrant_contact.country}
                </span>
              </text>
            </box>
          </box>
        )}

        {actionMessage && (
          <box backgroundColor={colors.success} padding={1}>
            <text>
              <span fg={colors.textInverse}>{actionMessage}</span>
            </text>
          </box>
        )}
      </box>
    );
  };

  return (
    <box flexDirection="column" gap={1}>
      <text>
        <span fg={colors.primary}>Domain Management</span>
      </text>
      <text>
        <span fg={colors.textMuted}>Register, transfer, and manage your domains</span>
      </text>

      {view === "details" ? (
        renderDetails()
      ) : (
        <>
          {renderTabs()}
          {tab === "domains" && renderDomainsList()}
          {tab === "search" && renderSearch()}
          {tab === "transfer" && renderTransfer()}
        </>
      )}
    </box>
  );
}
