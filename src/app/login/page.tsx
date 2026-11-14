import { LoginForm } from "@/components/Forms";
import { login } from "../actions";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-[12vh] max-w-sm">
      <h1 className="text-[34px] leading-none font-extrabold tracking-tight">Radar</h1>
      <p className="mt-2 mb-6 text-muted">Relevamiento de precios de Avalto.</p>
      <div className="panel p-6">
        <LoginForm action={login} />
      </div>
    </div>
  );
}
