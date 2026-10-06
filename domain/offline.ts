type UnknownError = {
  message?: string | null;
  code?: string | null;
  status?: number | string | null;
};

export type NetworkStatusCopy = {
  title: string;
  body: string;
  tone: "online" | "offline";
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as UnknownError).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

export function getNetworkStatusCopy(isOnline: boolean): NetworkStatusCopy {
  return isOnline
    ? {
        title: "Con conexión",
        body: "Ya podés guardar cambios en Supabase. Si algo quedó pendiente, intenta de nuevo.",
        tone: "online",
      }
    : {
        title: "Sin conexión",
        body: "Podés seguir viendo esta pantalla y conservamos lo que escribiste. Para guardar, reconecta e intenta de nuevo.",
        tone: "offline",
      };
}

export function normalizeSupabaseErrorMessage(error: unknown, isOnline = true) {
  const message = getErrorMessage(error).toLowerCase();

  if (!isOnline || message.includes("failed to fetch") || message.includes("network") || message.includes("fetch failed")) {
    return "Sin conexión. Conservamos lo que escribiste; revisa tu internet e intenta de nuevo.";
  }

  if (
    message.includes("jwt") ||
    message.includes("auth") ||
    message.includes("session") ||
    message.includes("token") ||
    message.includes("invalid login")
  ) {
    return "Tu sesión necesita refrescarse. Inicia sesión de nuevo para continuar.";
  }

  if (message.includes("row level security") || message.includes("permission") || message.includes("not authorized")) {
    return "No tenés permiso para completar esta acción con esta sesión. Vuelve a iniciar sesión e intenta de nuevo.";
  }

  return "No se pudo completar la acción. Revisa los datos e intenta de nuevo.";
}

const SERVICE_WORKER_STATIC_ALLOWLIST = new Set(["/", "/manifest.json", "/icons/presucart.svg"]);

export function isServiceWorkerStaticAllowlistedPath(pathname: string) {
  return SERVICE_WORKER_STATIC_ALLOWLIST.has(pathname);
}

export function shouldServiceWorkerHandleRequest(url: string, method: string, appOrigin: string) {
  if (method.toUpperCase() !== "GET") return false;

  const requestUrl = new URL(url, appOrigin);
  if (requestUrl.origin !== appOrigin) return false;
  if (requestUrl.searchParams.has("_rsc")) return false;

  return isServiceWorkerStaticAllowlistedPath(requestUrl.pathname);
}
