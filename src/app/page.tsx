import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect root traffic to the primary dashboard locale
  redirect("/th/dashboard");
}
