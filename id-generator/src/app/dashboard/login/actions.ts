"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export type LoginActionState = {
  message: string | null;
};

export async function loginAction(
  _state: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard/mfa",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Invalid admin credentials." };
    }

    throw error;
  }

  return { message: null };
}
