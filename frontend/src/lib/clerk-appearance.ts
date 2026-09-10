/** Clerk UI in Pipeline colors so sign-in doesn't look like a third product. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#3352E1",
    colorText: "#12151C",
    colorTextSecondary: "#667085",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#12151C",
    colorNeutral: "#667085",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontFamilyButtons: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "shadow-none border border-[#E4E7EC] bg-white rounded-xl",
    headerTitle: "text-[#12151C] text-xl font-medium tracking-tight",
    headerSubtitle: "text-[#667085] text-sm",
    socialButtonsBlockButton:
      "border border-[#E4E7EC] hover:bg-[#F5F6F8] shadow-none",
    formButtonPrimary:
      "bg-[#3352E1] hover:bg-[#2945c9] shadow-none normal-case",
    footerActionLink: "text-[#3352E1] hover:underline",
    formFieldInput:
      "border border-[#E4E7EC] rounded-md focus:border-[#3352E1] shadow-none",
    identityPreview: "border border-[#E4E7EC]",
    dividerLine: "bg-[#E4E7EC]",
    dividerText: "text-[#667085] font-mono text-[11px]",
  },
};
