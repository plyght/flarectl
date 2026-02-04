import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import { listPagesProjects, type PagesProject } from "../lib/cloudflare.ts";
import { isAuthenticated } from "../lib/auth.ts";

type ViewState = "list" | "details";

export function Pages() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [view, setView] = useState<ViewState>("list");
  const [projects, setProjects] = useState<PagesProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<PagesProject | null>(null);

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated()) {
      setError("Not authenticated. Set CLOUDFLARE_API_TOKEN environment variable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listPagesProjects();
      setProjects(data);
      if (selectedIndex >= data.length) {
        setSelectedIndex(Math.max(0, data.length - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pages projects");
    } finally {
      setLoading(false);
    }
  }, [selectedIndex]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useKeyboard((key) => {
    if (view === "details") {
      if (key.name === "escape" || key.name === "backspace") {
        setView("list");
        setSelectedProject(null);
      }
      return;
    }

    const maxIndex = projects.length - 1;

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
      case "enter":
        if (projects[selectedIndex]) {
          setSelectedProject(projects[selectedIndex]);
          setView("details");
        }
        break;
      case "r":
        loadProjects();
        break;
    }
  });

  if (loading && projects.length === 0) {
    return (
      <box flexDirection="column" flexGrow={1} padding={2}>
        <box flexDirection="row" gap={1}>
          <text fg={colors.primary}>⟳</text>
          <text fg={colors.textMuted}>Loading projects...</text>
        </box>
      </box>
    );
  }

  if (error) {
    return (
      <box flexDirection="column" flexGrow={1} padding={2}>
        <text fg={colors.error}>Error: {error}</text>
        <text fg={colors.textMuted}>Press 'r' to retry</text>
      </box>
    );
  }

  if (view === "details" && selectedProject) {
    return (
      <box flexDirection="column" flexGrow={1} padding={1}>
        <box flexDirection="row" gap={1} marginBottom={1}>
          <text fg={colors.primary}>‹ Back (Esc)</text>
          <text>|</text>
          <text><strong>{selectedProject.name}</strong></text>
        </box>

        <box flexDirection="column" borderStyle="single" borderColor={colors.border} padding={1}>
          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Project Name:</text>
            <text>{selectedProject.name}</text>
          </box>
          
          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Subdomain:</text>
            <text>{selectedProject.subdomain}</text>
          </box>

          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Production Branch:</text>
            <text>{selectedProject.production_branch}</text>
          </box>

          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Created:</text>
            <text>{new Date(selectedProject.created_on).toLocaleString()}</text>
          </box>

          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>ID:</text>
            <text>{selectedProject.id}</text>
          </box>

          {selectedProject.domains && selectedProject.domains.length > 0 && (
            <box flexDirection="column" marginTop={1}>
              <text fg={colors.textMuted} marginBottom={1}>Custom Domains:</text>
              {selectedProject.domains.map((domain) => (
                <text key={domain}>• {domain}</text>
              ))}
            </box>
          )}
        </box>
      </box>
    );
  }

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <box flexDirection="column">
          <text>
            <strong fg={colors.primary}>Pages</strong>
          </text>
          <text>
            <span fg={colors.textMuted}>Full-stack web applications</span>
          </text>
        </box>
        <text fg={colors.textMuted}>
          {projects.length} projects • Press 'r' to refresh
        </text>
      </box>

      {projects.length === 0 ? (
        <box marginTop={1} borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No Pages projects found</span>
          </text>
        </box>
      ) : (
        <box flexDirection="column" flexGrow={1}>
          <box 
            flexDirection="row" 
            padding={1} 
            borderStyle="single" 
            borderColor={colors.border} 
            backgroundColor={colors.surfaceAlt}
          >
            <text width="30%"><strong>Name</strong></text>
            <text width="30%"><strong>Subdomain</strong></text>
            <text width="20%"><strong>Branch</strong></text>
            <text width="20%"><strong>Created</strong></text>
          </box>
          <scrollbox flexDirection="column" flexGrow={1}>
            {projects.map((project, index) => {
              const isSelected = index === selectedIndex;
              return (
                <box
                  key={project.id}
                  flexDirection="row"
                  padding={1}
                  backgroundColor={isSelected ? colors.surfaceAlt : undefined}
                >
                  <text width="30%" fg={isSelected ? colors.primary : colors.text}>
                    {isSelected ? "> " : "  "}{project.name}
                  </text>
                  <text width="30%" fg={isSelected ? colors.text : colors.textMuted}>
                    {project.subdomain}
                  </text>
                  <text width="20%" fg={isSelected ? colors.text : colors.textMuted}>
                    {project.production_branch}
                  </text>
                  <text width="20%" fg={isSelected ? colors.text : colors.textMuted}>
                    {new Date(project.created_on).toLocaleDateString()}
                  </text>
                </box>
              );
            })}
          </scrollbox>
        </box>
      )}
      
      <box marginTop={1}>
        <text fg={colors.textMuted}>
          ↑/↓: Navigate • Enter: Details • r: Refresh
        </text>
      </box>
    </box>
  );
}
