export const getCookie = (name: string) => {
  if (typeof window === "undefined") return null;
  const cookie = document.cookie.split("; ").find(row => row.startsWith(name));
  return cookie ? cookie.split("=")[1] : null;
};

export const setCookie = (name: string, value: string, options: { expires?: Date; path?: string } = {
  expires: new Date(Date.now() + 60 * 60 * 24 * 1000) // 1 day
}) => {
  if (typeof window === "undefined") return null;
    document.cookie = `${name}=${value}; ${options.expires ? `expires=${options.expires.toUTCString()};` : ""} path=${options.path || "/"}`;
};
