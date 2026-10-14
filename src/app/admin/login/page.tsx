import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-12 sm:px-10">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Admin</h1>
      <LoginForm />
    </div>
  );
}
