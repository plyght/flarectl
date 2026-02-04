import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import {
  listImages,
  deleteImage,
  listImageVariants,
  createImageVariant,
  deleteImageVariant,
  getImagesStats,
  type CloudflareImage,
  type ImageVariant,
  type ImagesStats,
} from "../lib/cloudflare.ts";

type Tab = "images" | "variants" | "upload";
type View = "list" | "details" | "create-variant";

export function Images() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [tab, setTab] = useState<Tab>("images");
  const [view, setView] = useState<View>("list");
  const [images, setImages] = useState<CloudflareImage[]>([]);
  const [variants, setVariants] = useState<ImageVariant[]>([]);
  const [stats, setStats] = useState<ImagesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<CloudflareImage | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ImageVariant | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [variantForm, setVariantForm] = useState({
    id: "",
    fit: "scale-down",
    width: "",
    height: "",
  });
  const [inputField, setInputField] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [imagesData, statsData] = await Promise.all([listImages(), getImagesStats()]);
      setImages(imagesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVariants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listImageVariants();
      setVariants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load variants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "images") {
      loadImages();
    } else if (tab === "variants") {
      loadVariants();
    }
  }, [tab, loadImages, loadVariants]);

  const handleDeleteImage = async () => {
    if (!selectedImage) return;
    try {
      await deleteImage(selectedImage.id);
      setActionMessage(`Image ${selectedImage.id} deleted`);
      setSelectedImage(null);
      setConfirmDelete(false);
      loadImages();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    }
  };

  const handleDeleteVariant = async () => {
    if (!selectedVariant) return;
    try {
      await deleteImageVariant(selectedVariant.id);
      setActionMessage(`Variant ${selectedVariant.id} deleted`);
      setSelectedVariant(null);
      setConfirmDelete(false);
      loadVariants();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete variant");
    }
  };

  const handleCreateVariant = async () => {
    if (!variantForm.id.trim()) {
      setError("Variant ID is required");
      return;
    }
    try {
      await createImageVariant(variantForm.id, {
        fit: variantForm.fit,
        width: variantForm.width ? parseInt(variantForm.width) : undefined,
        height: variantForm.height ? parseInt(variantForm.height) : undefined,
      });
      setActionMessage(`Variant ${variantForm.id} created`);
      setView("list");
      setVariantForm({ id: "", fit: "scale-down", width: "", height: "" });
      loadVariants();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create variant");
    }
  };

  useKeyboard((key) => {
    if (inputField) {
      if (key.name === "escape") {
        setInputField(null);
      } else if (key.name === "return") {
        setInputField(null);
      } else if (key.name === "backspace") {
        setVariantForm((prev) => ({
          ...prev,
          [inputField]: prev[inputField as keyof typeof prev].slice(0, -1),
        }));
      } else if (key.sequence && key.sequence.length === 1 && /^[a-zA-Z0-9-_]$/.test(key.sequence)) {
        setVariantForm((prev) => ({
          ...prev,
          [inputField]: prev[inputField as keyof typeof prev] + key.sequence,
        }));
      }
      return;
    }

    if (confirmDelete) {
      if (key.name === "y") {
        if (tab === "images") {
          handleDeleteImage();
        } else if (tab === "variants") {
          handleDeleteVariant();
        }
      } else if (key.name === "n" || key.name === "escape") {
        setConfirmDelete(false);
      }
      return;
    }

    if (view === "details") {
      if (key.name === "escape" || key.name === "q") {
        setView("list");
        setSelectedImage(null);
        setSelectedVariant(null);
      } else if (key.name === "d") {
        setConfirmDelete(true);
      }
      return;
    }

    if (view === "create-variant") {
      if (key.name === "escape") {
        setView("list");
      } else if (key.name === "1") {
        setInputField("id");
      } else if (key.name === "2") {
        const fits = ["scale-down", "contain", "cover", "crop", "pad"];
        const currentIndex = fits.indexOf(variantForm.fit);
        const nextIndex = (currentIndex + 1) % fits.length;
        setVariantForm((prev) => ({
          ...prev,
          fit: fits[nextIndex] || "scale-down",
        }));
      } else if (key.name === "3") {
        setInputField("width");
      } else if (key.name === "4") {
        setInputField("height");
      } else if (key.name === "return") {
        handleCreateVariant();
      }
      return;
    }

    if (key.name === "tab" || key.name === "right") {
      const tabs: Tab[] = ["images", "variants", "upload"];
      const currentIndex = tabs.indexOf(tab);
      const nextTab = tabs[(currentIndex + 1) % tabs.length];
      if (nextTab) setTab(nextTab);
      setSelectedIndex(0);
    } else if (key.name === "left") {
      const tabs: Tab[] = ["images", "variants", "upload"];
      const currentIndex = tabs.indexOf(tab);
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      if (prevTab) setTab(prevTab);
      setSelectedIndex(0);
    }

    if (tab === "images") {
      if (key.name === "up" || key.name === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "down" || key.name === "j") {
        setSelectedIndex((prev) => Math.min(images.length - 1, prev + 1));
      } else if (key.name === "return" && images[selectedIndex]) {
        setSelectedImage(images[selectedIndex]);
        setView("details");
      } else if (key.name === "r") {
        loadImages();
      }
    } else if (tab === "variants") {
      if (key.name === "up" || key.name === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "down" || key.name === "j") {
        setSelectedIndex((prev) => Math.min(variants.length - 1, prev + 1));
      } else if (key.name === "return" && variants[selectedIndex]) {
        setSelectedVariant(variants[selectedIndex]);
        setView("details");
      } else if (key.name === "n") {
        setView("create-variant");
      } else if (key.name === "r") {
        loadVariants();
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

  const renderTabs = () => (
    <box flexDirection="row" gap={2} marginBottom={1}>
      {(["images", "variants", "upload"] as Tab[]).map((t) => (
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
              {t === "images" ? "Images" : t === "variants" ? "Variants" : "Upload"}
            </span>
          </text>
        </box>
      ))}
    </box>
  );

  const renderStats = () =>
    stats && (
      <box flexDirection="row" gap={2} marginBottom={1}>
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>Images: </span>
            <span fg={colors.primary}>
              {stats.count.current} / {stats.count.allowed}
            </span>
          </text>
        </box>
      </box>
    );

  const renderImagesList = () => (
    <box flexDirection="column" gap={1}>
      {renderStats()}
      {loading ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.info}>Loading images...</span>
          </text>
        </box>
      ) : error ? (
        <box borderStyle="single" borderColor={colors.error} padding={1}>
          <text>
            <span fg={colors.error}>Error: {error}</span>
          </text>
        </box>
      ) : images.length === 0 ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No images uploaded. Use the Upload tab to add images.</span>
          </text>
        </box>
      ) : (
        <box flexDirection="column">
          <box flexDirection="row" paddingLeft={1} paddingRight={1} paddingBottom={1}>
            <box width={26}>
              <text>
                <span fg={colors.textMuted}>Image ID</span>
              </text>
            </box>
            <box width={24}>
              <text>
                <span fg={colors.textMuted}>Filename</span>
              </text>
            </box>
            <box width={14}>
              <text>
                <span fg={colors.textMuted}>Uploaded</span>
              </text>
            </box>
            <box width={10}>
              <text>
                <span fg={colors.textMuted}>Variants</span>
              </text>
            </box>
          </box>
          {images.map((image, index) => (
            <box
              key={image.id}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={index === selectedIndex ? colors.surfaceAlt : undefined}
            >
              <box width={26}>
                <text>
                  <span fg={index === selectedIndex ? colors.primary : colors.text}>
                    {image.id.slice(0, 22)}...
                  </span>
                </text>
              </box>
              <box width={24}>
                <text>
                  <span fg={colors.textMuted}>
                    {image.filename.length > 20 ? image.filename.slice(0, 18) + "..." : image.filename}
                  </span>
                </text>
              </box>
              <box width={14}>
                <text>
                  <span fg={colors.textMuted}>{formatDate(image.uploaded)}</span>
                </text>
              </box>
              <box width={10}>
                <text>
                  <span fg={colors.info}>{image.variants.length}</span>
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

  const renderVariantsList = () => (
    <box flexDirection="column" gap={1}>
      {loading ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.info}>Loading variants...</span>
          </text>
        </box>
      ) : variants.length === 0 ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No variants configured. Press 'n' to create a new variant.</span>
          </text>
        </box>
      ) : (
        <box flexDirection="column">
          <box flexDirection="row" paddingLeft={1} paddingRight={1} paddingBottom={1}>
            <box width={20}>
              <text>
                <span fg={colors.textMuted}>Variant ID</span>
              </text>
            </box>
            <box width={14}>
              <text>
                <span fg={colors.textMuted}>Fit</span>
              </text>
            </box>
            <box width={10}>
              <text>
                <span fg={colors.textMuted}>Width</span>
              </text>
            </box>
            <box width={10}>
              <text>
                <span fg={colors.textMuted}>Height</span>
              </text>
            </box>
          </box>
          {variants.map((variant, index) => (
            <box
              key={variant.id}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={index === selectedIndex ? colors.surfaceAlt : undefined}
            >
              <box width={20}>
                <text>
                  <span fg={index === selectedIndex ? colors.primary : colors.text}>{variant.id}</span>
                </text>
              </box>
              <box width={14}>
                <text>
                  <span fg={colors.info}>{variant.options.fit}</span>
                </text>
              </box>
              <box width={10}>
                <text>
                  <span fg={colors.textMuted}>{variant.options.width || "-"}</span>
                </text>
              </box>
              <box width={10}>
                <text>
                  <span fg={colors.textMuted}>{variant.options.height || "-"}</span>
                </text>
              </box>
            </box>
          ))}
        </box>
      )}
      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>↑/↓ Navigate • Enter View • n New Variant • r Refresh</span>
        </text>
      </box>
    </box>
  );

  const renderUpload = () => (
    <box flexDirection="column" gap={1}>
      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.primary}>Upload Image</span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              Upload images via the Cloudflare Images API or Dashboard.
            </span>
          </text>
        </box>
      </box>

      <box borderStyle="single" borderColor={colors.info} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Upload via API</span>
          </text>
          <text>
            <span fg={colors.info}>
              curl -X POST "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/images/v1" {"\n"}
              {"  "}-H "Authorization: Bearer API_TOKEN" {"\n"}
              {"  "}-F file=@image.jpg
            </span>
          </text>
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
              <span fg={colors.textMuted}> PNG</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> JPEG</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> GIF</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> WebP</span>
            </text>
            <text>
              <span fg={colors.success}>✓</span>
              <span fg={colors.textMuted}> SVG</span>
            </text>
          </box>
          <text>
            <span fg={colors.textMuted}>Max file size: 10MB</span>
          </text>
        </box>
      </box>

      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Image Transformations</span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              Access transformed images via URL: {"\n"}
              https://imagedelivery.net/HASH/IMAGE_ID/VARIANT_NAME
            </span>
          </text>
        </box>
      </box>
    </box>
  );

  const renderCreateVariant = () => (
    <box flexDirection="column" gap={1}>
      <box flexDirection="row" gap={2}>
        <text>
          <span fg={colors.textMuted}>← Esc to cancel</span>
        </text>
      </box>
      <box borderStyle="single" borderColor={colors.primary} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.primary}>Create Image Variant</span>
          </text>
          <box marginTop={1} flexDirection="column" gap={1}>
            <box flexDirection="row" gap={2}>
              <text>
                <span fg={colors.text}>[1] ID: </span>
                <span fg={inputField === "id" ? colors.primary : colors.textMuted}>
                  {variantForm.id || (inputField === "id" ? "_" : "press 1 to edit")}
                </span>
              </text>
            </box>
            <box flexDirection="row" gap={2}>
              <text>
                <span fg={colors.text}>[2] Fit: </span>
                <span fg={colors.info}>{variantForm.fit}</span>
                <span fg={colors.textMuted}> (press 2 to cycle)</span>
              </text>
            </box>
            <box flexDirection="row" gap={2}>
              <text>
                <span fg={colors.text}>[3] Width: </span>
                <span fg={inputField === "width" ? colors.primary : colors.textMuted}>
                  {variantForm.width || (inputField === "width" ? "_" : "auto")}
                </span>
              </text>
            </box>
            <box flexDirection="row" gap={2}>
              <text>
                <span fg={colors.text}>[4] Height: </span>
                <span fg={inputField === "height" ? colors.primary : colors.textMuted}>
                  {variantForm.height || (inputField === "height" ? "_" : "auto")}
                </span>
              </text>
            </box>
          </box>
          <box marginTop={1}>
            <text>
              <span fg={colors.success}>Press Enter to create variant</span>
            </text>
          </box>
        </box>
      </box>

      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Fit Options</span>
          </text>
          <box flexDirection="column">
            <text>
              <span fg={colors.info}>scale-down</span>
              <span fg={colors.textMuted}> - Shrink to fit, never enlarge</span>
            </text>
            <text>
              <span fg={colors.info}>contain</span>
              <span fg={colors.textMuted}> - Fit within dimensions</span>
            </text>
            <text>
              <span fg={colors.info}>cover</span>
              <span fg={colors.textMuted}> - Fill dimensions, crop if needed</span>
            </text>
            <text>
              <span fg={colors.info}>crop</span>
              <span fg={colors.textMuted}> - Crop to exact dimensions</span>
            </text>
            <text>
              <span fg={colors.info}>pad</span>
              <span fg={colors.textMuted}> - Fit within, add padding</span>
            </text>
          </box>
        </box>
      </box>
    </box>
  );

  const renderImageDetails = () => {
    if (!selectedImage) return null;
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
              <span fg={colors.textInverse}>Delete this image? [y]es / [n]o</span>
            </text>
          </box>
        )}

        <box borderStyle="single" borderColor={colors.primary} padding={1}>
          <box flexDirection="column" gap={1}>
            <text>
              <span fg={colors.primary}>{selectedImage.id}</span>
            </text>
            <box flexDirection="row" flexWrap="wrap" gap={2}>
              <box flexDirection="column" width={30}>
                <text>
                  <span fg={colors.textMuted}>Filename</span>
                </text>
                <text>
                  <span fg={colors.text}>{selectedImage.filename}</span>
                </text>
              </box>
              <box flexDirection="column" width={20}>
                <text>
                  <span fg={colors.textMuted}>Uploaded</span>
                </text>
                <text>
                  <span fg={colors.text}>{formatDate(selectedImage.uploaded)}</span>
                </text>
              </box>
              <box flexDirection="column" width={20}>
                <text>
                  <span fg={colors.textMuted}>Signed URLs</span>
                </text>
                <text>
                  <span fg={selectedImage.requireSignedURLs ? colors.success : colors.warning}>
                    {selectedImage.requireSignedURLs ? "Required" : "Not Required"}
                  </span>
                </text>
              </box>
            </box>
          </box>
        </box>

        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <box flexDirection="column" gap={1}>
            <text>
              <span fg={colors.text}>Available Variants ({selectedImage.variants.length})</span>
            </text>
            <box flexDirection="column">
              {selectedImage.variants.map((variant) => (
                <text key={variant}>
                  <span fg={colors.info}>{variant}</span>
                </text>
              ))}
            </box>
          </box>
        </box>

        <box marginTop={1}>
          <text>
            <span fg={colors.textMuted}>d Delete image</span>
          </text>
        </box>
      </box>
    );
  };

  const renderVariantDetails = () => {
    if (!selectedVariant) return null;
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
              <span fg={colors.textInverse}>Delete this variant? [y]es / [n]o</span>
            </text>
          </box>
        )}

        <box borderStyle="single" borderColor={colors.primary} padding={1}>
          <box flexDirection="column" gap={1}>
            <text>
              <span fg={colors.primary}>{selectedVariant.id}</span>
            </text>
            <box flexDirection="row" flexWrap="wrap" gap={2}>
              <box flexDirection="column" width={20}>
                <text>
                  <span fg={colors.textMuted}>Fit</span>
                </text>
                <text>
                  <span fg={colors.info}>{selectedVariant.options.fit}</span>
                </text>
              </box>
              <box flexDirection="column" width={15}>
                <text>
                  <span fg={colors.textMuted}>Width</span>
                </text>
                <text>
                  <span fg={colors.text}>{selectedVariant.options.width || "auto"}</span>
                </text>
              </box>
              <box flexDirection="column" width={15}>
                <text>
                  <span fg={colors.textMuted}>Height</span>
                </text>
                <text>
                  <span fg={colors.text}>{selectedVariant.options.height || "auto"}</span>
                </text>
              </box>
            </box>
          </box>
        </box>

        <box marginTop={1}>
          <text>
            <span fg={colors.textMuted}>d Delete variant</span>
          </text>
        </box>
      </box>
    );
  };

  return (
    <box flexDirection="column" gap={1}>
      <text>
        <span fg={colors.primary}>Images</span>
      </text>
      <text>
        <span fg={colors.textMuted}>Image optimization and delivery</span>
      </text>

      {actionMessage && (
        <box backgroundColor={colors.success} padding={1}>
          <text>
            <span fg={colors.textInverse}>{actionMessage}</span>
          </text>
        </box>
      )}

      {view === "details" && tab === "images" && renderImageDetails()}
      {view === "details" && tab === "variants" && renderVariantDetails()}
      {view === "create-variant" && renderCreateVariant()}
      {view === "list" && (
        <>
          {renderTabs()}
          {tab === "images" && renderImagesList()}
          {tab === "variants" && renderVariantsList()}
          {tab === "upload" && renderUpload()}
        </>
      )}
    </box>
  );
}
