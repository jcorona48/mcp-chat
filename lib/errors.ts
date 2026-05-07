import { routing } from "@/i18n/routing";

export type ErrorType =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "offline";

export type Surface =
  | "chat"
  | "auth"
  | "api"
  | "stream"
  | "database"
  | "history"
  | "vote"
  | "document"
  | "suggestions"
  | "activate_gateway";

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = "response" | "log" | "none";

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: "log",
  chat: "response",
  auth: "response",
  stream: "response",
  api: "response",
  history: "response",
  vote: "response",
  document: "response",
  suggestions: "response",
  activate_gateway: "response",
};

const errorMessages: Record<string, { en: string; es: string }> = {
  "somethingWentWrong": {
    en: "Something went wrong. Please try again later.",
    es: "Algo salió mal. Inténtalo de nuevo más tarde.",
  },
  "bad_request:api": {
    en: "The request couldn't be processed. Please check your input and try again.",
    es: "La solicitud no pudo ser procesada. Verifica tu información e intenta de nuevo.",
  },
  "bad_request:activate_gateway": {
    en: "AI Gateway requires a valid credit card on file to service requests. Please visit your account settings to add a card and unlock your free credits.",
    es: "AI Gateway requiere una tarjeta de crédito válida registrada. Visita la configuración de tu cuenta para agregar una tarjeta y desbloquear tus créditos gratuitos.",
  },
  "unauthorized:auth": {
    en: "You need to sign in before continuing.",
    es: "Debes iniciar sesión antes de continuar.",
  },
  "forbidden:auth": {
    en: "Your account does not have access to this feature.",
    es: "Tu cuenta no tiene acceso a esta función.",
  },
  "rate_limit:chat": {
    en: "You've reached the message limit. Come back in 1 hour to continue chatting.",
    es: "Has alcanzado el límite de mensajes. Regresa en 1 hora para continuar chateando.",
  },
  "not_found:chat": {
    en: "The requested chat was not found. Please check the chat ID and try again.",
    es: "El chat solicitado no fue encontrado. Verifica el ID del chat e intenta de nuevo.",
  },
  "forbidden:chat": {
    en: "This chat belongs to another user. Please check the chat ID and try again.",
    es: "Este chat pertenece a otro usuario. Verifica el ID del chat e intenta de nuevo.",
  },
  "unauthorized:chat": {
    en: "You need to sign in to view this chat. Please sign in and try again.",
    es: "Debes iniciar sesión para ver este chat. Inicia sesión e intenta de nuevo.",
  },
  "offline:chat": {
    en: "We're having trouble sending your message. Please check your internet connection and try again.",
    es: "Estamos teniendo problemas para enviar tu mensaje. Verifica tu conexión a internet e intenta de nuevo.",
  },
  "not_found:document": {
    en: "The requested document was not found. Please check the document ID and try again.",
    es: "El documento solicitado no fue encontrado. Verifica el ID del documento e intenta de nuevo.",
  },
  "forbidden:document": {
    en: "This document belongs to another user. Please check the document ID and try again.",
    es: "Este documento pertenece a otro usuario. Verifica el ID del documento e intenta de nuevo.",
  },
  "unauthorized:document": {
    en: "You need to sign in to view this document. Please sign in and try again.",
    es: "Debes iniciar sesión para ver este documento. Inicia sesión e intenta de nuevo.",
  },
  "bad_request:document": {
    en: "The request to create or update the document was invalid. Please check your input and try again.",
    es: "La solicitud para crear o actualizar el documento fue inválida. Verifica tu información e intenta de nuevo.",
  },
  "database": {
    en: "An error occurred while executing a database query.",
    es: "Ocurrió un error al ejecutar una consulta de base de datos.",
  },
};

function getLocale(): "en" | "es" {
  return routing.defaultLocale;
}

export class ChatbotError extends Error {
  type: ErrorType;
  surface: Surface;
  statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(":");

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === "log") {
      console.error({
        code,
        message,
        cause,
      });

      return Response.json(
        { code: "", message: errorMessages["somethingWentWrong"][getLocale()] },
        { status: statusCode }
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  const locale = getLocale();

  if (errorCode.includes("database")) {
    return errorMessages["database"][locale];
  }

  const msg = errorMessages[errorCode];
  if (msg) {
    return msg[locale];
  }

  return errorMessages["somethingWentWrong"][locale];
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case "bad_request":
      return 400;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "rate_limit":
      return 429;
    case "offline":
      return 503;
    default:
      return 500;
  }
}
