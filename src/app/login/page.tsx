import { LoginForm } from "@/components/auth/login-form";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const callbackUrl = getParam(params, "callbackUrl") ?? "/profile";
  const intent = getParam(params, "intent");

  return (
    <div className="mx-auto grid max-w-md gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Вход в профиль</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {intent === "favorites"
            ? "Войдите или зарегистрируйтесь, чтобы сохранять храмы в избранное."
            : "Email и пароль нужны для избранного, профиля и ваших отзывов."}
        </p>
      </div>
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
