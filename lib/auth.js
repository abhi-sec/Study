import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const TOKEN_NAME = "study_session";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

export const ADMIN_USERNAME = "abhisec";
export const ADMIN_PASSWORD = "Abhi@2718";

export const signSession = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });

export const verifySession = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

export const setSessionCookie = async (payload) => {
  const token = signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
};

export const clearSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
};

export const getSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
};
