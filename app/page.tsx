import { redirect } from "next/navigation";

export default function HomePage() {
  // P0: send to the manager overview. P3 routes by authenticated role
  // (manager → overview, agent → /me) behind the auth guard.
  redirect("/overview");
}
