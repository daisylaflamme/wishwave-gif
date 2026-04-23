/**
 * Platform helpers — single source of truth for "am I running inside the
 * native (Capacitor) mobile app?" Used to gate payment surfaces and to
 * route share/download/external-link flows through native plugins.
 */

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
};

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as CapacitorWindow).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function getPlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as CapacitorWindow).Capacitor;
  const p = cap?.getPlatform?.() ?? "web";
  return p === "ios" || p === "android" ? p : "web";
}

/** Open an external URL — uses the system browser on native, new tab on web. */
export async function openExternal(url: string): Promise<void> {
  if (isNativeApp()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    } catch (e) {
      console.warn("Capacitor Browser failed, falling back to window.open", e);
    }
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Share a file (or fall back to URL) via the native share sheet on mobile. */
export async function nativeShare(opts: {
  blob?: Blob;
  filename?: string;
  url?: string;
  text?: string;
  title?: string;
}): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { Share } = await import("@capacitor/share");
    const { Filesystem, Directory } = await import("@capacitor/filesystem");

    if (opts.blob && opts.filename) {
      const base64 = await blobToBase64(opts.blob);
      const written = await Filesystem.writeFile({
        path: opts.filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: opts.title,
        text: opts.text,
        url: written.uri,
        dialogTitle: opts.title,
      });
      return true;
    }
    await Share.share({
      title: opts.title,
      text: opts.text,
      url: opts.url,
      dialogTitle: opts.title,
    });
    return true;
  } catch (e) {
    console.warn("nativeShare failed", e);
    return false;
  }
}

/** Save a blob to the device's Documents directory. Returns the URI on success. */
export async function saveToDevice(blob: Blob, filename: string): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const base64 = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Documents,
    });
    return result.uri;
  } catch (e) {
    console.warn("saveToDevice failed", e);
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip "data:*/*;base64," prefix
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
