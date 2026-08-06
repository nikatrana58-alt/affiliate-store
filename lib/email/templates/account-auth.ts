import { renderBaseEmailTemplate } from "./base";

export type AuthEmailType = "welcome" | "verification" | "password_reset";

export function renderAccountAuthEmail(
  email: string,
  type: AuthEmailType,
  actionLink?: string
): string {
  const getDetails = () => {
    switch (type) {
      case "welcome":
        return {
          title: "Welcome to RA2Z Luxury",
          message: "Thank you for creating an account with RA2Z Luxury! Explore our exclusive product lines, manage your orders, and track your shipments anytime in your customer portal.",
          buttonText: "Access Customer Portal ↗",
        };
      case "verification":
        return {
          title: "Verify Your Email Address",
          message: "Please confirm your email address by clicking the link below to activate full access to your account.",
          buttonText: "Verify Email Address ↗",
        };
      case "password_reset":
        return {
          title: "Password Reset Request",
          message: "We received a request to reset your password. Click the link below to set a new password. If you did not make this request, you can safely ignore this email.",
          buttonText: "Reset Password ↗",
        };
    }
  };

  const details = getDetails();
  const link = actionLink || `${process.env.NEXT_PUBLIC_APP_URL || "https://ra2z.shop"}/account`;

  const bodyContentHtml = `
    <h2 style="margin: 0 0 8px; font-size: 22px; color: #FFFFFF;">${details.title}</h2>
    <p style="margin: 0 0 24px; color: #94A3B8; font-size: 14px; line-height: 1.6;">
      ${details.message}
    </p>

    <div style="text-align: center;">
      <a href="${link}" class="btn-gold">
        ${details.buttonText}
      </a>
    </div>
  `;

  return renderBaseEmailTemplate({
    title: details.title,
    preheader: details.message,
    bodyContentHtml,
    customerEmail: email,
  });
}
