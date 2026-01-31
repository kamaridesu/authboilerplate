"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInValues } from "@/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { oauthSignIn, signInAction } from "../actions";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { tr } from "zod/v4/locales";

function oauthErrorMessage(code: string) {
  switch (code) {
    case "oauth_invalid_provider":
      return "Unsupported sign-in method.";
    case "provider_error":
      return "Sign-in failed please try again.";
    case "oauth_callback_params":
      return "Sign-in failed. Please try again.";
    case "oauth_state":
      return "Sign-in failed. Please try again.";

    case "oauth_verifier":
      return "Sign-in failed. Please try again.";
    case "oauth_token":
      return "Sign-in failed. Please try again.";
    case "oauth_token_retrieval":
      return "Sign-in failed. Please try again.";
    case "oauth_parser":
      return "Sign-in failed. Please try again.";
    case "oauth_no_email":
      return "Sign-in failed. Please try again.";

    case "not_provisioned":
      return "Your account is not provisioned for access. Contact an administrator.";
    case "provider_not_allowed":
      return "This sign-in method is not allowed for your account.";

    default:
      return "Sign-in failed please try again.";
  }
}

export function SignInForm() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!oauthError) return;
    form.setError("root", { message: oauthErrorMessage(oauthError) });
    // optional: you could also prefill the email if you pass it in query params later
  }, [oauthError, form]);

  async function onSubmit(values: SignInValues) {
    try {
      form.clearErrors("root");

      const fd = new FormData();
      fd.set("email", values.email);
      fd.set("password", values.password);

      const result = await signInAction(fd);

      if (!result.success) {
        form.setError("root", { message: result.error });
        return;
      }
    } catch (e) {
      form.setError("root", { message: "Service unavailable. Try again." });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex">
          <Button
            variant={"outline"}
            className="mx-auto w-100"
            type="button"
            onClick={async () => await oauthSignIn("MICROSOFT")}
          >
            Microsoft
          </Button>
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  disabled={form.formState.isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  disabled={form.formState.isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root?.message ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}
