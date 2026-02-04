import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import {
  listStreamVideos,
  getStreamVideo,
  deleteStreamVideo,
  createStreamDirectUpload,
  type StreamVideo,
} from "../lib/cloudflare.ts";

type View = "list" | "details" | "upload" | "settings";
type Tab = "videos" | "upload" | "settings";

interface UploadProgress {
  status: "idle" | "preparing" | "uploading" | "processing" | "complete" | "error";
  progress: number;
  message: string;
  uploadUrl?: string;
  videoId?: string;
}

export function Stream() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<Tab>("videos");
  const [videos, setVideos] = useState<StreamVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<StreamVideo | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStreamVideos();
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleDelete = async () => {
    if (!selectedVideo) return;
    try {
      await deleteStreamVideo(selectedVideo.uid);
      setSelectedVideo(null);
      setView("list");
      setConfirmDelete(false);
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete video");
    }
  };

  const initiateUpload = async () => {
    setUploadProgress({
      status: "preparing",
      progress: 10,
      message: "Preparing upload...",
    });
    try {
      const result = await createStreamDirectUpload({
        maxDurationSeconds: 3600,
        requireSignedURLs: false,
      });
      setUploadProgress({
        status: "uploading",
        progress: 20,
        message: "Upload URL ready. Use the URL below to upload via curl or HTTP client:",
        uploadUrl: result.uploadURL,
        videoId: result.uid,
      });
    } catch (err) {
      setUploadProgress({
        status: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Failed to initiate upload",
      });
    }
  };

  useKeyboard((key) => {
    if (confirmDelete) {
      if (key.name === "y") {
        handleDelete();
      } else if (key.name === "n" || key.name === "escape") {
        setConfirmDelete(false);
      }
      return;
    }

    if (view === "details") {
      if (key.name === "escape" || key.name === "q") {
        setView("list");
        setSelectedVideo(null);
      } else if (key.name === "d") {
        setConfirmDelete(true);
      }
      return;
    }

    if (key.name === "tab" || key.name === "right") {
      const tabs: Tab[] = ["videos", "upload", "settings"];
      const currentIndex = tabs.indexOf(tab);
      const nextTab = tabs[(currentIndex + 1) % tabs.length];
      if (nextTab) setTab(nextTab);
    } else if (key.name === "left") {
      const tabs: Tab[] = ["videos", "upload", "settings"];
      const currentIndex = tabs.indexOf(tab);
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      if (prevTab) setTab(prevTab);
    }

    if (tab === "videos") {
      if (key.name === "up" || key.name === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "down" || key.name === "j") {
        setSelectedIndex((prev) => Math.min(videos.length - 1, prev + 1));
      } else if (key.name === "return" && videos[selectedIndex]) {
        setSelectedVideo(videos[selectedIndex]);
        setView("details");
      } else if (key.name === "r") {
        loadVideos();
      }
    } else if (tab === "upload") {
      if (key.name === "u" && uploadProgress.status === "idle") {
        initiateUpload();
      } else if (key.name === "escape") {
        setUploadProgress({ status: "idle", progress: 0, message: "" });
      }
    }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return colors.success;
      case "inprogress":
      case "queued":
        return colors.warning;
      case "error":
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const renderTabs = () => (
    <box flexDirection="row" gap={2} marginBottom={1}>
      {(["videos", "upload", "settings"] as Tab[]).map((t) => (
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
              {t === "videos" ? "Videos" : t === "upload" ? "Upload" : "Player Settings"}
            </span>
          </text>
        </box>
      ))}
    </box>
  );

  const renderProgressBar = (progress: number, width: number = 40) => {
    const filled = Math.floor((progress / 100) * width);
    const empty = width - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${progress}%`;
  };

  const renderVideosList = () => (
    <box flexDirection="column" gap={1}>
      {loading ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.info}>Loading videos...</span>
          </text>
        </box>
      ) : error ? (
        <box borderStyle="single" borderColor={colors.error} padding={1}>
          <text>
            <span fg={colors.error}>Error: {error}</span>
          </text>
        </box>
      ) : videos.length === 0 ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No videos uploaded. Use the Upload tab to add videos.</span>
          </text>
        </box>
      ) : (
        <box flexDirection="column">
          <box flexDirection="row" paddingLeft={1} paddingRight={1} paddingBottom={1}>
            <box width={24}>
              <text>
                <span fg={colors.textMuted}>Video ID</span>
              </text>
            </box>
            <box width={12}>
              <text>
                <span fg={colors.textMuted}>Status</span>
              </text>
            </box>
            <box width={10}>
              <text>
                <span fg={colors.textMuted}>Duration</span>
              </text>
            </box>
            <box width={12}>
              <text>
                <span fg={colors.textMuted}>Size</span>
              </text>
            </box>
            <box width={12}>
              <text>
                <span fg={colors.textMuted}>Resolution</span>
              </text>
            </box>
          </box>
          {videos.map((video, index) => (
            <box
              key={video.uid}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={index === selectedIndex ? colors.surfaceAlt : undefined}
            >
              <box width={24}>
                <text>
                  <span fg={index === selectedIndex ? colors.primary : colors.text}>
                    {video.uid.slice(0, 20)}...
                  </span>
                </text>
              </box>
              <box width={12}>
                <text>
                  <span fg={getStatusColor(video.status.state)}>
                    {video.readyToStream ? "Ready" : video.status.state}
                  </span>
                </text>
              </box>
              <box width={10}>
                <text>
                  <span fg={colors.textMuted}>{formatDuration(video.duration)}</span>
                </text>
              </box>
              <box width={12}>
                <text>
                  <span fg={colors.textMuted}>{formatSize(video.size)}</span>
                </text>
              </box>
              <box width={12}>
                <text>
                  <span fg={colors.textMuted}>
                    {video.input.width}x{video.input.height}
                  </span>
                </text>
              </box>
            </box>
          ))}
        </box>
      )}
      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>↑/↓ Navigate • Enter View Details • r Refresh</span>
        </text>
      </box>
    </box>
  );

  const renderUpload = () => (
    <box flexDirection="column" gap={1}>
      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.primary}>Upload Video to Stream</span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              Create a direct upload URL for uploading videos up to 1 hour in duration.
            </span>
          </text>

          {uploadProgress.status === "idle" && (
            <box marginTop={1}>
              <text>
                <span fg={colors.info}>Press 'u' to initiate upload</span>
              </text>
            </box>
          )}

          {uploadProgress.status !== "idle" && (
            <box marginTop={1} flexDirection="column" gap={1}>
              <box flexDirection="row" gap={2}>
                <text>
                  <span fg={colors.text}>Status: </span>
                  <span
                    fg={
                      uploadProgress.status === "error"
                        ? colors.error
                        : uploadProgress.status === "complete"
                        ? colors.success
                        : colors.info
                    }
                  >
                    {uploadProgress.status}
                  </span>
                </text>
              </box>

              <text>
                <span fg={colors.primary}>{renderProgressBar(uploadProgress.progress)}</span>
              </text>

              <text>
                <span fg={colors.textMuted}>{uploadProgress.message}</span>
              </text>

              {uploadProgress.uploadUrl && (
                <box borderStyle="single" borderColor={colors.info} padding={1} marginTop={1}>
                  <box flexDirection="column" gap={1}>
                    <text>
                      <span fg={colors.text}>Upload URL (valid for 30 minutes):</span>
                    </text>
                    <text>
                      <span fg={colors.info}>{uploadProgress.uploadUrl.slice(0, 60)}...</span>
                    </text>
                    <box marginTop={1}>
                      <text>
                        <span fg={colors.textMuted}>Upload using curl:</span>
                      </text>
                    </box>
                    <text>
                      <span fg={colors.warning}>curl -X POST -F file=@video.mp4 "{uploadProgress.uploadUrl}"</span>
                    </text>
                    {uploadProgress.videoId && (
                      <box marginTop={1}>
                        <text>
                          <span fg={colors.text}>Video ID: </span>
                          <span fg={colors.primary}>{uploadProgress.videoId}</span>
                        </text>
                      </box>
                    )}
                  </box>
                </box>
              )}
            </box>
          )}
        </box>
      </box>

      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Supported Formats</span>
          </text>
          <box flexDirection="row" gap={2}>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> MP4</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> MKV</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> MOV</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> AVI</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> WebM</span>
            </text>
          </box>
          <text>
            <span fg={colors.textMuted}>Max file size: 30GB • Max duration: 12 hours (with paid plan)</span>
          </text>
        </box>
      </box>

      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>u Initiate upload • Esc Cancel</span>
        </text>
      </box>
    </box>
  );

  const renderSettings = () => (
    <box flexDirection="column" gap={1}>
      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.primary}>Player Settings</span>
          </text>
          <text>
            <span fg={colors.textMuted}>Configure Stream player behavior and appearance.</span>
          </text>
        </box>
      </box>

      <box flexDirection="row" gap={2}>
        <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>Default Controls</span>
            </text>
            <text>
              <span fg={colors.success}>Enabled</span>
            </text>
            <text>
              <span fg={colors.textMuted}>Show play/pause, volume, fullscreen</span>
            </text>
          </box>
        </box>
        <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>Autoplay</span>
            </text>
            <text>
              <span fg={colors.warning}>Disabled</span>
            </text>
            <text>
              <span fg={colors.textMuted}>Requires user interaction</span>
            </text>
          </box>
        </box>
      </box>

      <box flexDirection="row" gap={2}>
        <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>Loop</span>
            </text>
            <text>
              <span fg={colors.warning}>Disabled</span>
            </text>
            <text>
              <span fg={colors.textMuted}>Video plays once</span>
            </text>
          </box>
        </box>
        <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>Signed URLs</span>
            </text>
            <text>
              <span fg={colors.warning}>Optional</span>
            </text>
            <text>
              <span fg={colors.textMuted}>Per-video setting</span>
            </text>
          </box>
        </box>
      </box>

      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Embed Code Example</span>
          </text>
          <text>
            <span fg={colors.info}>
              {"<stream src=\"VIDEO_ID\" controls></stream>"}
            </span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              Include Stream SDK: {"<script src=\"https://embed.cloudflarestream.com/embed/sdk.latest.js\"></script>"}
            </span>
          </text>
        </box>
      </box>
    </box>
  );

  const renderDetails = () => {
    if (!selectedVideo) return null;
    return (
      <box flexDirection="column" gap={1}>
        <box flexDirection="row" gap={2}>
          <text>
            <span fg={colors.textMuted}>← Esc to go back</span>
          </text>
        </box>

        {confirmDelete && (
          <box backgroundColor={colors.error} padding={1}>
            <text>
              <span fg={colors.textInverse}>
                Delete this video? This action cannot be undone. [y]es / [n]o
              </span>
            </text>
          </box>
        )}

        <box borderStyle="single" borderColor={colors.primary} padding={1}>
          <box flexDirection="column" gap={1}>
            <text>
              <span fg={colors.primary}>{selectedVideo.uid}</span>
            </text>
            <box flexDirection="row" flexWrap="wrap" gap={2}>
              <box flexDirection="column" width={20}>
                <text>
                  <span fg={colors.textMuted}>Status</span>
                </text>
                <text>
                  <span fg={getStatusColor(selectedVideo.status.state)}>
                    {selectedVideo.readyToStream ? "Ready to Stream" : selectedVideo.status.state}
                  </span>
                </text>
              </box>
              <box flexDirection="column" width={20}>
                <text>
                  <span fg={colors.textMuted}>Duration</span>
                </text>
                <text>
                  <span fg={colors.text}>{formatDuration(selectedVideo.duration)}</span>
                </text>
              </box>
              <box flexDirection="column" width={20}>
                <text>
                  <span fg={colors.textMuted}>Size</span>
                </text>
                <text>
                  <span fg={colors.text}>{formatSize(selectedVideo.size)}</span>
                </text>
              </box>
              <box flexDirection="column" width={20}>
                <text>
                  <span fg={colors.textMuted}>Resolution</span>
                </text>
                <text>
                  <span fg={colors.text}>
                    {selectedVideo.input.width}x{selectedVideo.input.height}
                  </span>
                </text>
              </box>
            </box>
          </box>
        </box>

        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <box flexDirection="column" gap={1}>
            <text>
              <span fg={colors.text}>Playback URLs</span>
            </text>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>HLS: </span>
                <span fg={colors.info}>{selectedVideo.playback.hls}</span>
              </text>
              <text>
                <span fg={colors.textMuted}>DASH: </span>
                <span fg={colors.info}>{selectedVideo.playback.dash}</span>
              </text>
              <text>
                <span fg={colors.textMuted}>Preview: </span>
                <span fg={colors.info}>{selectedVideo.preview}</span>
              </text>
            </box>
          </box>
        </box>

        <box flexDirection="row" gap={2}>
          <box borderStyle="single" borderColor={colors.border} padding={1}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Uploaded</span>
              </text>
              <text>
                <span fg={colors.text}>{formatDate(selectedVideo.uploaded)}</span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Modified</span>
              </text>
              <text>
                <span fg={colors.text}>{formatDate(selectedVideo.modified)}</span>
              </text>
            </box>
          </box>
          <box
            borderStyle="single"
            borderColor={selectedVideo.requireSignedURLs ? colors.success : colors.border}
            padding={1}
          >
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Signed URLs</span>
              </text>
              <text>
                <span fg={selectedVideo.requireSignedURLs ? colors.success : colors.warning}>
                  {selectedVideo.requireSignedURLs ? "Required" : "Not Required"}
                </span>
              </text>
            </box>
          </box>
        </box>

        <box marginTop={1}>
          <text>
            <span fg={colors.textMuted}>d Delete video</span>
          </text>
        </box>
      </box>
    );
  };

  return (
    <box flexDirection="column" gap={1}>
      <text>
        <span fg={colors.primary}>Stream</span>
      </text>
      <text>
        <span fg={colors.textMuted}>Video streaming and delivery</span>
      </text>

      {view === "details" ? (
        renderDetails()
      ) : (
        <>
          {renderTabs()}
          {tab === "videos" && renderVideosList()}
          {tab === "upload" && renderUpload()}
          {tab === "settings" && renderSettings()}
        </>
      )}
    </box>
  );
}
